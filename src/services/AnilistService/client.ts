/**
 * Cliente único do AniList, compartilhado pelo catálogo de animes e pelo de
 * mangás: os dois consultam o mesmo endpoint GraphQL e só mudam a query.
 *
 * O AniList limita por IP (hoje 30 requisições por minuto, em modo degradado)
 * e, enquanto o browser falava direto com ele, cada visitante gastava a
 * própria cota refazendo as mesmas consultas que o anterior já tinha feito. Por
 * isso ele só é chamado do servidor, pelo handler /api/anilist/[op]; o browser
 * fala com esse handler (`fromServer`), e as respostas ficam em três camadas
 * compartilhadas entre todos os visitantes: a memória da função, o Data Cache
 * do Next e a CDN da Vercel.
 */

const ANILIST_URL = "https://graphql.anilist.co";

export const isBrowser = typeof window !== "undefined";

/**
 * Até quando o AniList mandou esperar. Durante a pausa as consultas continuam
 * passando pelo Data Cache — o que já está guardado segue sendo servido —, mas
 * nenhuma chega à rede: insistir só estende o bloqueio do IP.
 */
let pausadoAte = 0;

/** Pausa quando o 429 vem sem `Retry-After`. */
const PAUSA_PADRAO = 60;

interface RequestOptions {
  /**
   * Por quantos segundos o Data Cache do Next guarda a resposta. Ele é
   * compartilhado por todas as instâncias da função, então uma consulta feita
   * para um visitante atende todos os seguintes.
   */
  revalidate?: number;
}

/**
 * Executa uma consulta e devolve só o `data`. Qualquer falha — rede, rate
 * limit ou erro de GraphQL — vira `null`, e quem chamou decide o que exibir.
 */
export const anilistRequest = async <T>(
  query: string,
  variables: Record<string, unknown>,
  { revalidate = 60 * 60 }: RequestOptions = {}
): Promise<T | null> => {
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate },
      // Um sinal já abortado não entra na chave do Data Cache: o que estiver
      // guardado volta normalmente, e só a ida à rede é cancelada.
      signal: Date.now() < pausadoAte ? AbortSignal.abort() : undefined,
    });

    if (res.status === 429) {
      const espera = Number(res.headers.get("retry-after")) || PAUSA_PADRAO;
      pausadoAte = Date.now() + espera * 1000;
      return null;
    }
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.errors?.length) return null;
    return data?.data as T;
  } catch (err) {
    return null;
  }
};

type Params = Record<string, string | number | string[] | undefined>;

/**
 * O lado do browser: pede ao /api/anilist/[op] o resultado já montado pelo
 * serviço. Os gêneros vão ordenados para que a mesma escolha, feita em
 * qualquer ordem, caia na mesma entrada da CDN.
 */
export const fromServer = async <T>(
  op: string,
  params: Params = {}
): Promise<T | null> => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, genresKey(value));
      continue;
    }
    search.set(key, String(value));
  }

  try {
    const query = search.toString();
    const res = await fetch(`/api/anilist/${op}${query ? `?${query}` : ""}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    return null;
  }
};

/** Capa exibida quando o AniList não tem imagem cadastrada. */
export const DEFAULT_COVER =
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/default.jpg";

export const EMPTY_RESPONSE: ResponseApiProps = {
  currentPage: 1,
  hasNextPage: false,
  results: [],
};

/** Chave estável: a ordem dos gêneros escolhidos não pode mudar o cache. */
export const genresKey = (genres: string[]) => [...genres].sort().join(",");
