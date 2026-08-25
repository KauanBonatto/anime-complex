/**
 * Cache com TTL para as respostas das APIs de terceiros (AniList e TMDB).
 *
 * Listas e textos mudam pouco ao longo do dia, mas o app refaz as mesmas
 * consultas a cada navegação — trocar de página e voltar, reabrir a ficha de
 * um anime, repetir uma busca. Guardar o resultado por pelo menos uma hora
 * corta essas idas repetidas, deixa a navegação instantânea e mantém o
 * consumo de rate limit longe do teto (o AniList permite poucas requisições
 * por minuto por IP).
 */

export const ONE_HOUR = 60 * 60 * 1000;
export const ONE_DAY = 24 * ONE_HOUR;

const STORAGE_PREFIX = "anime-complex:cache:";

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

interface CacheOptions {
  /** Separa as chaves de caches diferentes dentro do mesmo storage. */
  namespace: string;
  /** Validade de cada entrada. Padrão: uma hora. */
  ttl?: number;
  /** Teto de entradas em memória; as menos usadas saem primeiro. */
  maxEntries?: number;
  /**
   * Guarda também no localStorage, para o cache sobreviver a um reload da
   * página. Só tem efeito no browser.
   */
  persist?: boolean;
}

interface ResolveOptions<T> {
  /**
   * Decide se o resultado merece cache. Serve para não congelar por uma hora
   * uma resposta vazia vinda de erro de rede.
   */
  shouldStore?: (value: T) => boolean;
}

export interface Cache<T> {
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
  /**
   * Devolve o valor em cache ou executa o loader. Chamadas simultâneas para a
   * mesma chave compartilham a mesma requisição.
   */
  resolve: (
    key: string,
    loader: () => Promise<T>,
    options?: ResolveOptions<T>
  ) => Promise<T>;
  clear: () => void;
}

const localStore = (persist: boolean): Storage | null => {
  if (!persist || typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (err) {
    // Modo privado ou cookies bloqueados: seguimos só com o cache em memória.
    return null;
  }
};

/** Remove o que já venceu — é o que abre espaço quando o storage enche. */
const purgeExpired = (storage: Storage) => {
  const now = Date.now();
  const stale: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    try {
      const entry = JSON.parse(storage.getItem(key) ?? "");
      if (typeof entry?.expiresAt !== "number" || entry.expiresAt <= now) {
        stale.push(key);
      }
    } catch (err) {
      stale.push(key);
    }
  }

  stale.forEach((key) => storage.removeItem(key));
};

export const createCache = <T>({
  namespace,
  ttl = ONE_HOUR,
  maxEntries = 60,
  persist = false,
}: CacheOptions): Cache<T> => {
  const entries = new Map<string, CacheEntry<T>>();
  const pending = new Map<string, Promise<T>>();

  const storageKey = (key: string) => `${STORAGE_PREFIX}${namespace}:${key}`;

  const readPersisted = (key: string): CacheEntry<T> | null => {
    const storage = localStore(persist);
    const raw = storage?.getItem(storageKey(key));
    if (!raw) return null;

    try {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (typeof entry?.expiresAt !== "number") return null;
      if (entry.expiresAt <= Date.now()) {
        storage?.removeItem(storageKey(key));
        return null;
      }
      return entry;
    } catch (err) {
      storage?.removeItem(storageKey(key));
      return null;
    }
  };

  const writePersisted = (key: string, entry: CacheEntry<T>) => {
    const storage = localStore(persist);
    if (!storage) return;

    const write = () => storage.setItem(storageKey(key), JSON.stringify(entry));
    try {
      write();
    } catch (err) {
      // Storage cheio: limpamos o que venceu e tentamos uma única vez mais.
      try {
        purgeExpired(storage);
        write();
      } catch (retryErr) {
        // Sem espaço mesmo; o cache em memória já resolve a sessão atual.
      }
    }
  };

  /** Reinsere a chave para que o Map mantenha a ordem de uso (LRU simples). */
  const remember = (key: string, entry: CacheEntry<T>) => {
    entries.delete(key);
    entries.set(key, entry);

    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  };

  const get = (key: string): T | undefined => {
    const entry = entries.get(key);
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        remember(key, entry);
        return entry.value;
      }
      entries.delete(key);
    }

    const persisted = readPersisted(key);
    if (!persisted) return undefined;

    remember(key, persisted);
    return persisted.value;
  };

  const set = (key: string, value: T) => {
    const entry: CacheEntry<T> = { expiresAt: Date.now() + ttl, value };
    remember(key, entry);
    writePersisted(key, entry);
  };

  const resolve = (
    key: string,
    loader: () => Promise<T>,
    options: ResolveOptions<T> = {}
  ): Promise<T> => {
    const cached = get(key);
    if (cached !== undefined) return Promise.resolve(cached);

    const inFlight = pending.get(key);
    if (inFlight) return inFlight;

    const request = loader()
      .then((value) => {
        if (!options.shouldStore || options.shouldStore(value)) set(key, value);
        return value;
      })
      .finally(() => {
        pending.delete(key);
      });

    pending.set(key, request);
    return request;
  };

  const clear = () => {
    entries.clear();
    pending.clear();
  };

  return { get, set, resolve, clear };
};
