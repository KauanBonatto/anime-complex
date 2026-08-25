/**
 * Sinopses em pt-BR. O AniList só devolve descrição em inglês, então buscamos
 * o texto localizado no TMDB e caímos de volta para o AniList quando não há
 * tradução.
 *
 * Este módulo roda SOMENTE no servidor: a chave do TMDB não pode ir para o
 * browser. Quem consome é o handler /api/synopsis/[anime_id].
 */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * O TMDB não conhece IDs do AniList. O Fribb/anime-lists mantém a tabela de
 * equivalência entre as bases de anime, e é ela que nos dá o ID certo mesmo em
 * franquias com várias temporadas — onde buscar por título erra feio.
 */
const MAPPING_URL =
  "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json";
const MAPPING_TTL = 24 * 60 * 60 * 1000;

/**
 * O arquivo tem ~6 MB e é baixado uma vez por processo. Se ele ainda não
 * estiver pronto, não seguramos a resposta esperando: caímos direto para a
 * busca por título e o mapa fica disponível para as próximas requisições.
 */
const MAPPING_BUDGET = 2_500;

/** Sinopse muda muito pouco; um dia de cache evita bater no TMDB à toa. */
const TMDB_REVALIDATE = 24 * 60 * 60;

const REQUEST_TIMEOUT = 8_000;

/** Buscar sem ano pode trazer outro anime; limitamos as tentativas. */
const MAX_SEARCH_ATTEMPTS = 3;

interface TmdbRef {
  kind: "tv" | "movie";
  id: number;
  /** Temporada correspondente no TMDB, quando o anime é parte de uma série. */
  season: number | null;
}

export interface SynopsisResult {
  description: string | null;
  /** Título em pt-BR, quando o TMDB tem um. */
  title: string | null;
  source: "tmdb" | null;
}

const EMPTY_RESULT: SynopsisResult = {
  description: null,
  title: null,
  source: null,
};

interface FribbEntry {
  anilist_id?: number;
  /** O campo `movie` vem como lista de IDs; `tv` vem como número solto. */
  themoviedb_id?: { tv?: number | number[]; movie?: number | number[] };
  season?: { tmdb?: number };
}

interface TmdbTitle {
  overview?: string | null;
  name?: string | null;
  title?: string | null;
}

interface TmdbSearchResult extends TmdbTitle {
  id: number;
  first_air_date?: string | null;
  release_date?: string | null;
}

let mappingCache: { fetchedAt: number; refs: Map<number, TmdbRef> } | null =
  null;
let pendingMapping: Promise<Map<number, TmdbRef>> | null = null;

/** Tabela AniList -> TMDB, baixada uma vez e mantida em memória. */
const loadMapping = async (): Promise<Map<number, TmdbRef>> => {
  const cache = mappingCache;
  if (cache && Date.now() - cache.fetchedAt < MAPPING_TTL) return cache.refs;
  if (pendingMapping) return pendingMapping;

  pendingMapping = fetchMapping().finally(() => {
    pendingMapping = null;
  });
  return pendingMapping;
};

const fetchMapping = async (): Promise<Map<number, TmdbRef>> => {
  const refs = new Map<number, TmdbRef>();

  try {
    const response = await fetch(MAPPING_URL, { cache: "no-store" });
    if (!response.ok) return refs;

    const entries: FribbEntry[] = await response.json();
    for (const entry of entries) {
      const ref = toRef(entry);
      if (entry.anilist_id && ref) refs.set(entry.anilist_id, ref);
    }
  } catch (err) {
    return refs;
  }

  // Só guardamos um mapa que veio completo; um download falho não vira cache.
  if (refs.size) mappingCache = { fetchedAt: Date.now(), refs };
  return refs;
};

/** Quando há mais de um ID (refilmagens, versões), o primeiro é o principal. */
const firstId = (value?: number | number[]): number | null => {
  const id = Array.isArray(value) ? value[0] : value;
  return typeof id === "number" && id > 0 ? id : null;
};

const toRef = (entry: FribbEntry): TmdbRef | null => {
  const tv = firstId(entry.themoviedb_id?.tv);
  if (tv) return { kind: "tv", id: tv, season: entry.season?.tmdb ?? null };

  const movie = firstId(entry.themoviedb_id?.movie);
  if (movie) return { kind: "movie", id: movie, season: null };

  return null;
};

/** Espera o mapa só até o orçamento de tempo; depois seguimos sem ele. */
const mappingWithinBudget = async (): Promise<Map<number, TmdbRef> | null> => {
  const cache = mappingCache;
  if (cache && Date.now() - cache.fetchedAt < MAPPING_TTL) return cache.refs;

  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), MAPPING_BUDGET)
  );
  return Promise.race([loadMapping(), timeout]);
};

/**
 * A chave v4 do TMDB é um JWT e vai no header; a v3 é uma string simples e vai
 * na query. Aceitamos as duas para não errar na configuração.
 */
const tmdbRequest = async <T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T | null> => {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("language", "pt-BR");
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const isBearer = key.includes(".");
  if (!isBearer) url.searchParams.set("api_key", key);

  try {
    const response = await fetch(url, {
      headers: isBearer ? { Authorization: `Bearer ${key}` } : {},
      next: { revalidate: TMDB_REVALIDATE },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (err) {
    return null;
  }
};

/** O TMDB devolve string vazia — e não nulo — quando falta a tradução. */
const text = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const toResult = (data: TmdbTitle | null): SynopsisResult => {
  const description = text(data?.overview);
  if (!description) return EMPTY_RESULT;

  return {
    description,
    title: text(data?.name) ?? text(data?.title),
    source: "tmdb",
  };
};

const fromRef = async (ref: TmdbRef): Promise<SynopsisResult> => {
  if (ref.kind === "movie") {
    return toResult(await tmdbRequest<TmdbTitle>(`/movie/${ref.id}`));
  }

  // Cada temporada tem sinopse própria no TMDB; a da série cobre a primeira.
  if (ref.season && ref.season > 1) {
    const season = toResult(
      await tmdbRequest<TmdbTitle>(`/tv/${ref.id}/season/${ref.season}`)
    );
    if (season.description) return season;
  }

  return toResult(await tmdbRequest<TmdbTitle>(`/tv/${ref.id}`));
};

interface SearchAttempt {
  query: string;
  year?: number;
}

const searchAttempts = (
  titles: string[],
  year: number | null
): SearchAttempt[] => {
  const attempts: SearchAttempt[] = [];
  for (const query of titles) {
    if (year) attempts.push({ query, year });
    attempts.push({ query });
  }
  return attempts.slice(0, MAX_SEARCH_ATTEMPTS);
};

const resultYear = (result: TmdbSearchResult): number | null => {
  const date = result.first_air_date ?? result.release_date;
  const year = Number(date?.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
};

/**
 * Sem o ano no filtro, o primeiro resultado pode ser outro anime da franquia.
 * Quando sabemos o ano do AniList, exigimos que bata (com um ano de folga,
 * porque as bases divergem em estreias no fim do ano).
 */
const pickResult = (
  results: TmdbSearchResult[],
  year: number | null
): TmdbSearchResult | null => {
  const [first] = results;
  if (!first) return null;
  if (!year) return first;

  const match = results.find((result) => resultYear(result) === year);
  if (match) return match;

  const firstYear = resultYear(first);
  return firstYear && Math.abs(firstYear - year) <= 1 ? first : null;
};

/** Plano B quando o anime não está na tabela de equivalência. */
const fromSearch = async (
  titles: string[],
  year: number | null,
  format: string | null
): Promise<SynopsisResult> => {
  if (!titles.length) return EMPTY_RESULT;

  const isMovie = format === "MOVIE";
  const path = isMovie ? "/search/movie" : "/search/tv";
  const yearParam = isMovie ? "primary_release_year" : "first_air_date_year";

  for (const attempt of searchAttempts(titles, year)) {
    const params: Record<string, string> = { query: attempt.query };
    if (attempt.year) params[yearParam] = String(attempt.year);

    const data = await tmdbRequest<{ results?: TmdbSearchResult[] }>(
      path,
      params
    );
    const picked = pickResult(data?.results ?? [], year);
    const result = toResult(picked);
    if (result.description) return result;
  }

  return EMPTY_RESULT;
};

export interface SynopsisQuery {
  anilistId: number;
  titles: string[];
  year: number | null;
  format: string | null;
}

/**
 * Sinopse em pt-BR de um anime do AniList. Devolve descrição nula quando o
 * TMDB não tem tradução — aí o chamador mantém o texto do AniList, que é mais
 * completo que a versão em inglês do próprio TMDB.
 */
export const getPtBrSynopsis = async ({
  anilistId,
  titles,
  year,
  format,
}: SynopsisQuery): Promise<SynopsisResult> => {
  if (!process.env.TMDB_API_KEY) return EMPTY_RESULT;

  const mapping = await mappingWithinBudget();
  const ref = mapping?.get(anilistId);

  if (ref) {
    const mapped = await fromRef(ref);
    if (mapped.description) return mapped;
  }

  return fromSearch(titles, year, format);
};
