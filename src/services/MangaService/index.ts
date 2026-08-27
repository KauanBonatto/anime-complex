/**
 * Catálogo de mangás, servido pelo mesmo AniList que alimenta os animes —
 * só muda o `type: MANGA` das consultas. Por isso o cliente HTTP, o cache e
 * os tipos de resposta são os mesmos usados pelo AnilistService.
 */

import {
  MANGA_DETAILS_QUERY,
  POPULAR_MANGA_QUERY,
  RECENT_MANGA_QUERY,
  SEARCH_MANGA_QUERY,
  TOP_RATED_MANGA_QUERY,
} from "./queries";
import { AnilistManga, AnilistMangaPage } from "./types";
import {
  DEFAULT_COVER,
  EMPTY_RESPONSE,
  anilistRequest,
  genresKey,
} from "../AnilistService/client";
import { cleanDescription } from "@/utils/anime";
import { ONE_HOUR, createCache } from "@/utils/cache";

const PER_PAGE = 24;

/**
 * Janela dos "lançamentos recentes". Um ano é o suficiente para uma obra nova
 * juntar leitores e aparecer aqui, sem deixar a lista virar um retrato de
 * títulos que já estão em publicação há anos.
 */
const RECENT_WINDOW_YEARS = 1;

const listCache = createCache<ResponseApiProps>({
  namespace: "anilist:manga-list",
  ttl: ONE_HOUR,
  persist: true,
});

const detailsCache = createCache<MangaDetailsProps | null>({
  // O sufixo acompanha o formato da ficha: fichas guardadas antes de um campo
  // novo existir seguiriam válidas por uma hora, sem ele.
  namespace: "anilist:manga-details:v1",
  ttl: ONE_HOUR,
  persist: true,
});

/** O AniList compara datas como inteiro no formato AAAAMMDD. */
const fuzzyDateYearsAgo = (years: number) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return Number(`${date.getFullYear()}${month}${day}`);
};

/**
 * O índice do AniList deixa escapar um registro antigo aqui e ali mesmo com
 * `startDate_greater` aplicado, e um título de anos atrás numa lista chamada
 * "lançamentos recentes" salta aos olhos. O ano vem junto na resposta, então
 * conferimos de novo aqui.
 */
const startedWithinWindow = (manga: AnimeProps, minYear: number) =>
  !!manga.releaseDate && Number(manga.releaseDate) >= minYear;

/** Papéis do staff que interessam na ficha: quem escreveu e quem desenhou. */
const isAuthorRole = (role?: string | null) =>
  /story|art/i.test(role ?? "");

class MangaServiceClass {
  private request = anilistRequest;

  /** Mangás mais populares, opcionalmente filtrados por gênero. */
  async getPopularManga(
    page: number = 1,
    genres: string[] = []
  ): Promise<ResponseApiProps> {
    const key = `popular:${page}:${genresKey(genres)}`;
    return this.cachedList(key, async () => {
      const data = await this.request<{ Page: AnilistMangaPage }>(
        POPULAR_MANGA_QUERY,
        { page, perPage: PER_PAGE, genres: genres.length ? genres : undefined }
      );
      return this.toResponse(data?.Page, page);
    });
  }

  /** Mangás com as melhores notas da comunidade. */
  async getTopRatedManga(
    page: number = 1,
    genres: string[] = []
  ): Promise<ResponseApiProps> {
    const key = `top:${page}:${genresKey(genres)}`;
    return this.cachedList(key, async () => {
      const data = await this.request<{ Page: AnilistMangaPage }>(
        TOP_RATED_MANGA_QUERY,
        { page, perPage: PER_PAGE, genres: genres.length ? genres : undefined }
      );
      return this.toResponse(data?.Page, page);
    });
  }

  /** Obras que começaram a ser publicadas no último ano e seguem no ar. */
  async getRecentManga(
    page: number = 1,
    genres: string[] = []
  ): Promise<ResponseApiProps> {
    const key = `recent:${page}:${genresKey(genres)}`;
    return this.cachedList(key, async () => {
      const data = await this.request<{ Page: AnilistMangaPage }>(
        RECENT_MANGA_QUERY,
        {
          page,
          perPage: PER_PAGE,
          genres: genres.length ? genres : undefined,
          startDate: fuzzyDateYearsAgo(RECENT_WINDOW_YEARS),
        }
      );
      const response = this.toResponse(data?.Page, page);
      const minYear = new Date().getFullYear() - RECENT_WINDOW_YEARS;

      return {
        ...response,
        results: response.results.filter((manga) =>
          startedWithinWindow(manga, minYear)
        ),
      };
    });
  }

  async getMangaBySearch(
    search: string,
    page: number = 1,
    genres: string[] = []
  ): Promise<ResponseApiProps> {
    const term = search.trim();
    if (!term) return EMPTY_RESPONSE;

    const key = `search:${term.toLowerCase()}:${page}:${genresKey(genres)}`;
    return this.cachedList(key, async () => {
      const data = await this.request<{ Page: AnilistMangaPage }>(
        SEARCH_MANGA_QUERY,
        {
          page,
          perPage: PER_PAGE,
          search: term,
          genres: genres.length ? genres : undefined,
        }
      );
      return this.toResponse(data?.Page, page);
    });
  }

  async getMangaDetails(
    anilistId: string | number
  ): Promise<MangaDetailsProps | null> {
    const id = Number(anilistId);
    if (!id) return null;

    return detailsCache.resolve(
      `details:${id}`,
      () => this.fetchMangaDetails(id),
      // Uma falha de rede não pode esconder o mangá pela hora seguinte.
      { shouldStore: (details) => details !== null }
    );
  }

  private async fetchMangaDetails(
    id: number
  ): Promise<MangaDetailsProps | null> {
    const data = await this.request<{ Media: AnilistManga }>(
      MANGA_DETAILS_QUERY,
      { id }
    );
    if (!data?.Media) return null;

    const manga = data.Media;
    return {
      ...this.toManga(manga),
      description: cleanDescription(manga.description),
      bannerImage: manga.bannerImage ?? null,
      siteUrl: manga.siteUrl ?? null,
      malUrl: manga.idMal
        ? `https://myanimelist.net/manga/${manga.idMal}`
        : null,
      rankings: manga.rankings ?? [],
      authors: this.toAuthors(manga),
      startYear: manga.startDate?.year ?? null,
      endYear: manga.endDate?.year ?? null,
    };
  }

  /**
   * Só guardamos listas que vieram com resultados: uma resposta vazia costuma
   * ser erro de rede ou rate limit, e cachear isso deixaria a tela vazia pela
   * hora seguinte.
   */
  private cachedList(
    key: string,
    loader: () => Promise<ResponseApiProps>
  ): Promise<ResponseApiProps> {
    return listCache.resolve(key, loader, {
      shouldStore: (response) => response.results.length > 0,
    });
  }

  /**
   * A ordem vem pronta da API — cada consulta já pede o `sort` que a seção
   * precisa. Reordenar aqui desfaria a lista de melhores avaliados.
   */
  private toResponse(
    page: AnilistMangaPage | undefined,
    fallbackPage: number
  ): ResponseApiProps {
    if (!page) return { ...EMPTY_RESPONSE, currentPage: fallbackPage };
    return {
      currentPage: page.pageInfo?.currentPage ?? fallbackPage,
      hasNextPage: page.pageInfo?.hasNextPage ?? false,
      results: this.dedupe((page.media ?? []).map((m) => this.toManga(m))),
    };
  }

  private toManga(manga: AnilistManga): AnimeProps {
    return {
      id: String(manga.id),
      malId: manga.idMal,
      title: manga.title?.romaji ?? manga.title?.english ?? "Sem título",
      titleEnglish: manga.title?.english ?? null,
      image:
        manga.coverImage?.extraLarge ??
        manga.coverImage?.large ??
        DEFAULT_COVER,
      genres: manga.genres ?? [],
      releaseDate: manga.startDate?.year ? String(manga.startDate.year) : null,
      // O AniList devolve a nota de 0 a 100; exibimos no formato 0 a 10.
      score: manga.averageScore ? manga.averageScore / 10 : null,
      popularity: manga.popularity ?? null,
      favourites: manga.favourites ?? null,
      format: manga.format ?? null,
      status: manga.status ?? null,
      totalChapters: manga.chapters ?? null,
      totalVolumes: manga.volumes ?? null,
    };
  }

  private toAuthors(manga: AnilistManga): string[] {
    const names = (manga.staff?.edges ?? [])
      .filter((edge) => isAuthorRole(edge.role))
      .map((edge) => edge.node?.name?.full)
      .filter((name): name is string => !!name);

    return Array.from(new Set(names));
  }

  private dedupe(mangas: AnimeProps[]): AnimeProps[] {
    const seen = new Set<string>();
    return mangas.filter((manga) => {
      if (seen.has(manga.id)) return false;
      seen.add(manga.id);
      return true;
    });
  }
}

const MangaService = new MangaServiceClass();
export default MangaService;
