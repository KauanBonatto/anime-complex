import axios from "axios";

/**
 * Cliente único do AniList, compartilhado pelo catálogo de animes e pelo de
 * mangás: os dois consultam o mesmo endpoint GraphQL e só mudam a query.
 */
const anilistApi = axios.create({
  baseURL: "https://graphql.anilist.co",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * Executa uma consulta e devolve só o `data`. Qualquer falha — rede, rate
 * limit ou erro de GraphQL — vira `null`, e quem chamou decide o que exibir.
 */
export const anilistRequest = async <T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T | null> => {
  try {
    const { data } = await anilistApi.post("", { query, variables });
    if (data?.errors?.length) return null;
    return data?.data as T;
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
