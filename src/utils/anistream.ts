/**
 * Peças compartilhadas entre as rotas do AniStream: a configuração vinda do
 * ambiente, a obtenção do token do Jellyfin, um fetch autenticado com
 * re-tentativa em 401, e a codificação do endereço de stream que mantém o
 * token fora do browser.
 *
 * O AniStream é um Jellyfin. As chamadas de dados/vídeo vão ao Jellyfin
 * (app.anistream.biz), que é estável. O que gera o token é o backend próprio
 * deles (api.anistream.biz) — atrás de um Cloudflare que responde 502 para
 * clientes de datacenter (Vercel), além de exigir um cookie de login que
 * expira. Por isso o caminho preferido é um TOKEN JÁ PRONTO, guardado em env:
 * ele fala direto com o Jellyfin, sem tocar no api.anistream.biz. O login sob
 * demanda continua existindo como fallback, útil em ambiente residencial.
 */

/** Identidade enviada ao Jellyfin no header Authorization (padrão do app). */
const CLIENT = "Anistream";
const CLIENT_VERSION = "1.8.8";
const DEFAULT_DEVICE = "anime-complex";

export interface AnistreamConfig {
  /** Jellyfin que serve os itens e o vídeo (app.anistream.biz). */
  jellyfinBase: string;
  /** Backend do AniStream que emite o token (api.anistream.biz). */
  apiBase: string;
  /** Identifica o dispositivo no header Authorization do Jellyfin. */
  deviceId?: string;
  /** Fallback (só de IP residencial): gera o token via /authenticate. */
  password?: string;
  /** Cookie de login do api.anistream.biz, exigido pelo /authenticate. */
  session?: string;
  /** Caminho preferido: token e usuário já prontos, sem renovação automática. */
  staticToken?: string;
  staticUserId?: string;
}

export interface AnistreamCredentials {
  token: string;
  userId: string;
}

/** Header Authorization do Jellyfin, no formato que o app do AniStream usa. */
export const mediaBrowserAuth = (
  token: string,
  deviceId?: string
): string =>
  `MediaBrowser Client="${CLIENT}", Device="${CLIENT} Web", ` +
  `DeviceId="${deviceId || DEFAULT_DEVICE}", Version="${CLIENT_VERSION}", ` +
  `Token="${token}"`;

/**
 * Lê a configuração do ambiente. Aceita dois modos, e o do token pronto tem
 * prioridade: token + userId fixos (ANISTREAM_TOKEN/ANISTREAM_USER_ID) ou, como
 * fallback, login sob demanda (deviceId + password + cookie). Sem nenhum dos
 * dois completo, o provider fica desligado.
 */
export const anistreamConfig = (): AnistreamConfig | null => {
  const jellyfinBase = (
    process.env.ANISTREAM_BASE_URL ?? "https://app.anistream.biz"
  ).replace(/\/+$/, "");
  const apiBase = (
    process.env.ANISTREAM_API_URL ?? "https://api.anistream.biz"
  ).replace(/\/+$/, "");

  const deviceId = process.env.ANISTREAM_DEVICE_ID || undefined;
  const password = process.env.ANISTREAM_PASSWORD || undefined;
  const session = process.env.ANISTREAM_SESSION || undefined;
  // ANISTREAM_TOKEN é o nome novo; ANISTREAM_API_KEY segue aceito por compat.
  const staticToken =
    process.env.ANISTREAM_TOKEN || process.env.ANISTREAM_API_KEY || undefined;
  const staticUserId = process.env.ANISTREAM_USER_ID || undefined;

  const hasStatic = !!(staticToken && staticUserId);
  const hasAuth = !!(deviceId && password);
  if (!hasStatic && !hasAuth) return null;

  return {
    jellyfinBase,
    apiBase,
    deviceId,
    password,
    session,
    staticToken,
    staticUserId,
  };
};

/**
 * Token em cache no processo. Não tem validade fixa — o Jellyfin só o invalida
 * quando é revogado (outra sessão assume) —, então guardamos até um 401 provar
 * que venceu. Some a cada cold start do servidor, e aí ele é gerado de novo.
 */
let tokenCache: AnistreamCredentials | null = null;

/**
 * Momento da última falha de login. Quando o mint falha (backend deles em pico,
 * 502/429), esperamos este intervalo antes de tentar de novo — senão, com o
 * token revogado, cada requisição martela o login justo quando ele já sofre.
 */
let mintFailedAt: number | null = null;
const MINT_COOLDOWN = 30_000;

const canMint = () =>
  mintFailedAt === null || Date.now() - mintFailedAt >= MINT_COOLDOWN;

/**
 * Nº de tentativas de login. O backend do AniStream oscila para 502 por
 * instantes e volta sozinho, então uma falha de gateway não pode derrubar o
 * provider — repetimos algumas vezes, com uma pausa curta entre elas.
 */
const AUTH_ATTEMPTS = 3;
const AUTH_RETRY_DELAY = 700;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Autentica no backend do AniStream e devolve um AccessToken novo. */
const authenticate = async (
  config: AnistreamConfig,
  timeout: number
): Promise<AnistreamCredentials | null> => {
  if (!config.deviceId || !config.password) return null;

  for (let attempt = 1; attempt <= AUTH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${config.apiBase}/app/jellyfin/authenticate`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(timeout),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          // O /authenticate não recebe usuário no corpo: quem diz de quem é a
          // senha é o cookie de login. Vai junto quando configurado.
          ...(config.session ? { Cookie: `session=${config.session}` } : {}),
        },
        body: JSON.stringify({
          deviceId: config.deviceId,
          password: config.password,
        }),
      });

      // 5xx é o gateway tremendo; 429 é "aguarde alguns segundos". Nenhum dos
      // dois é a credencial recusada, então vale repetir.
      const transient = response.status >= 500 || response.status === 429;
      if (transient && attempt < AUTH_ATTEMPTS) {
        await wait(AUTH_RETRY_DELAY);
        continue;
      }
      if (!response.ok) return null;

      const body = await response.json();
      const token: string | undefined = body?.data?.AccessToken;
      const userId: string | undefined = body?.data?.User?.Id;
      if (!token || !userId) return null;

      return { token, userId };
    } catch {
      // Timeout/rede: mais uma tentativa, se ainda houver.
      if (attempt < AUTH_ATTEMPTS) await wait(AUTH_RETRY_DELAY);
    }
  }

  return null;
};

/**
 * Devolve credenciais válidas. O token pronto (env) tem prioridade e é o que
 * funciona em produção, porque fala direto com o Jellyfin. Só quando ele falta,
 * ou quando um 401 pede renovação (`refresh`), cai no login sob demanda — que
 * só vinga de IP residencial.
 */
export const resolveCredentials = async (
  config: AnistreamConfig,
  timeout: number,
  refresh = false
): Promise<AnistreamCredentials | null> => {
  const staticCreds =
    config.staticToken && config.staticUserId
      ? { token: config.staticToken, userId: config.staticUserId }
      : null;

  // Caminho confiável: usa o token pronto sem nenhuma ida ao api.anistream.biz.
  // No `refresh` a gente pula ele, porque foi justamente ele que tomou 401.
  if (staticCreds && !refresh) return staticCreds;

  if (config.deviceId && config.password) {
    if (!refresh && tokenCache) return tokenCache;

    // Depois de uma falha recente de login, segura um pouco antes de insistir.
    if (canMint()) {
      const fresh = await authenticate(config, timeout);
      if (fresh) {
        tokenCache = fresh;
        mintFailedAt = null;
        return fresh;
      }
      mintFailedAt = Date.now();
    }
  }

  // Sem renovar: melhor devolver o token pronto (mesmo que revogado) do que
  // nada — quem chamou trata o 401. Some de vez só quando não há token algum.
  return refresh ? null : staticCreds;
};

/** Corpo JSON opcional de uma chamada autenticada. */
interface AuthorizedInit {
  method?: string;
  json?: unknown;
}

/**
 * Faz um fetch autenticado no Jellyfin. Em 401/403 o token venceu: renova uma
 * vez e repete. Devolve a resposta crua — quem chama decide ler como JSON ou
 * repassar em streaming.
 */
export const authorizedFetch = async (
  config: AnistreamConfig,
  url: URL,
  timeout: number,
  init: AuthorizedInit = {}
): Promise<Response | null> => {
  const creds = await resolveCredentials(config, timeout);
  if (!creds) return null;

  const send = (token: string) =>
    fetch(url, {
      method: init.method ?? "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
      headers: {
        // Header nativo do Jellyfin, como o app do AniStream envia.
        Authorization: mediaBrowserAuth(token, config.deviceId),
        ...(init.json !== undefined
          ? { "Content-Type": "application/json", Accept: "application/json" }
          : {}),
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
    });

  let response = await send(creds.token);
  if (response.status === 401 || response.status === 403) {
    const renewed = await resolveCredentials(config, timeout, true);
    if (renewed) response = await send(renewed.token);
  }
  return response;
};

/** Chamada autenticada no Jellyfin (GET por padrão), já com o JSON parseado. */
export const jellyfinJson = async <T>(
  config: AnistreamConfig,
  path: string,
  params: Record<string, string>,
  timeout: number,
  init: AuthorizedInit = {}
): Promise<T | null> => {
  const url = new URL(config.jellyfinBase + path);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await authorizedFetch(config, url, timeout, init);
  if (!response || !response.ok) return null;
  return (await response.json()) as T;
};

/**
 * Guarda só o caminho + query da URL do Jellyfin (sem o host e sem o token) e
 * o codifica em base64url. O proxy reconstrói o endereço a partir da base fixa,
 * então nem o host interno nem o token aparecem no que o browser recebe — e o
 * `src` não pode ser desviado para outro servidor (nada de SSRF).
 */
export const encodeStreamSrc = (pathWithQuery: string): string => {
  const clean = stripToken(pathWithQuery);
  return Buffer.from(clean, "utf8").toString("base64url");
};

/** Desfaz o `encodeStreamSrc`, devolvendo o caminho + query relativo. */
export const decodeStreamSrc = (src: string): string | null => {
  try {
    const decoded = Buffer.from(src, "base64url").toString("utf8");
    // Precisa ser um caminho relativo: barra no início, sem esquema nem host.
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
    return decoded;
  } catch {
    return null;
  }
};

/** Tira qualquer token de um caminho+query, sem depender de host. */
const stripToken = (pathWithQuery: string): string => {
  const [path, query = ""] = pathWithQuery.split("?");
  if (!query) return path;

  const params = new URLSearchParams(query);
  // O Jellyfin aceita a chave em qualquer caixa; remove todas as variações.
  for (const key of Array.from(params.keys())) {
    const lower = key.toLowerCase();
    if (lower === "apikey" || lower === "api_key") params.delete(key);
  }

  const rest = params.toString();
  return rest ? `${path}?${rest}` : path;
};
