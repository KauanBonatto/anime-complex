import axios from "axios";
import {
  ANIME_DETAILS_QUERY,
  POPULAR_ANIME_QUERY,
  RECENT_ANIME_QUERY,
  RECENT_EPISODES_QUERY,
  SEARCH_ANIME_QUERY,
} from "./queries";
import { AnilistMedia, AnilistPage } from "./types";

const anilistApi = axios.create({
  baseURL: "https://graphql.anilist.co",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const PER_PAGE = 24;

/**
 * A grade de exibição do AniList só ordena por horário, então buscamos uma
 * janela maior de episódios recentes de uma vez, ordenamos por popularidade e
 * paginamos em memória. Assim os mais populares vêm primeiro na lista inteira,
 * e não apenas dentro de uma página.
 */
const AIRING_WINDOW_PAGE_SIZE = 50;
const AIRING_WINDOW_PAGES = 3;
const AIRING_WINDOW_TTL = 5 * 60 * 1000;

const DEFAULT_COVER =
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/default.jpg";

const EMPTY_RESPONSE: ResponseApiProps = {
  currentPage: 1,
  hasNextPage: false,
  results: [],
};

class AnilistServiceClass {
  private async request<T>(
    query: string,
    variables: Record<string, unknown>
  ): Promise<T | null> {
    try {
      const { data } = await anilistApi.post("", { query, variables });
      if (data?.errors?.length) return null;
      return data?.data as T;
    } catch (err) {
      return null;
    }
  }

  /** Animes mais populares, opcionalmente filtrados por gênero. */
  async getPopularAnime(
    page: number = 1,
    genres: string[] = []
  ): Promise<ResponseApiProps> {
    const data = await this.request<{ Page: AnilistPage }>(
      POPULAR_ANIME_QUERY,
      { page, perPage: PER_PAGE, genres: genres.length ? genres : undefined }
    );
    return this.toResponse(data?.Page, page);
  }

  /**
   * Últimos episódios que foram ao ar. Quando há filtro de gênero o AniList não
   * permite filtrar a grade de exibição, então caímos para os lançamentos mais
   * recentes do gênero escolhido.
   */
  async getRecentAnime(
    page: number = 1,
    genres: string[] = []
  ): Promise<ResponseApiProps> {
    if (genres.length) {
      const data = await this.request<{ Page: AnilistPage }>(
        RECENT_ANIME_QUERY,
        { page, perPage: PER_PAGE, genres }
      );
      return this.toResponse(data?.Page, page);
    }

    const window = await this.getRecentEpisodesWindow();
    const start = (page - 1) * PER_PAGE;
    const results = window.slice(start, start + PER_PAGE);

    return {
      currentPage: page,
      hasNextPage: start + PER_PAGE < window.length,
      results,
    };
  }

  private recentEpisodesWindow: {
    fetchedAt: number;
    results: AnimeProps[];
  } | null = null;

  private pendingWindow: Promise<AnimeProps[]> | null = null;

  /** Janela de episódios recentes já ordenada por popularidade, com cache. */
  private async getRecentEpisodesWindow(): Promise<AnimeProps[]> {
    const cache = this.recentEpisodesWindow;
    if (cache && Date.now() - cache.fetchedAt < AIRING_WINDOW_TTL) {
      return cache.results;
    }
    if (this.pendingWindow) return this.pendingWindow;

    this.pendingWindow = this.fetchRecentEpisodesWindow().finally(() => {
      this.pendingWindow = null;
    });
    return this.pendingWindow;
  }

  private async fetchRecentEpisodesWindow(): Promise<AnimeProps[]> {
    const airingAt = Math.floor(Date.now() / 1000);
    const pages = await Promise.all(
      Array.from({ length: AIRING_WINDOW_PAGES }, (_, index) =>
        this.request<{ Page: AnilistPage }>(RECENT_EPISODES_QUERY, {
          page: index + 1,
          perPage: AIRING_WINDOW_PAGE_SIZE,
          airingAt,
        })
      )
    );

    const results = pages
      .flatMap((data) => data?.Page?.airingSchedules ?? [])
      .filter((schedule) => !schedule.media?.isAdult)
      .map((schedule) => ({
        ...this.toAnime(schedule.media),
        episodeNumber: schedule.episode,
        airedAt: schedule.airingAt,
      }));

    const window = this.sortByPopularity(this.dedupe(results));
    if (window.length) {
      this.recentEpisodesWindow = { fetchedAt: Date.now(), results: window };
    }
    return window;
  }

  async getAnimeBySearch(
    search: string,
    page: number = 1,
    genres: string[] = []
  ): Promise<ResponseApiProps> {
    if (!search.trim()) return EMPTY_RESPONSE;
    const data = await this.request<{ Page: AnilistPage }>(SEARCH_ANIME_QUERY, {
      page,
      perPage: PER_PAGE,
      search: search.trim(),
      genres: genres.length ? genres : undefined,
    });
    return this.toResponse(data?.Page, page);
  }

  async getAnimeDetails(
    anilistId: string | number
  ): Promise<AnimeDetailsProps | null> {
    const id = Number(anilistId);
    if (!id) return null;

    const data = await this.request<{ Media: AnilistMedia }>(
      ANIME_DETAILS_QUERY,
      { id }
    );
    if (!data?.Media) return null;

    const media = data.Media;
    return {
      ...this.toAnime(media),
      description: this.cleanDescription(media.description),
      bannerImage: media.bannerImage ?? null,
      season: media.season ?? null,
      seasonYear: media.seasonYear ?? null,
      studios: media.studios?.nodes?.map((studio) => studio.name) ?? [],
      siteUrl: media.siteUrl ?? null,
      malUrl: media.idMal
        ? `https://myanimelist.net/anime/${media.idMal}`
        : null,
      duration: media.duration ?? null,
      rankings: media.rankings ?? [],
      availableEpisodes: this.toAvailableEpisodes(media),
      nextEpisode: this.toNextEpisode(media),
    };
  }

  private toResponse(
    page: AnilistPage | undefined,
    fallbackPage: number
  ): ResponseApiProps {
    if (!page) return { ...EMPTY_RESPONSE, currentPage: fallbackPage };
    return {
      currentPage: page.pageInfo?.currentPage ?? fallbackPage,
      hasNextPage: page.pageInfo?.hasNextPage ?? false,
      results: this.sortByPopularity(
        this.dedupe((page.media ?? []).map((m) => this.toAnime(m)))
      ),
    };
  }

  private toAnime(media: AnilistMedia): AnimeProps {
    return {
      id: String(media.id),
      malId: media.idMal,
      title: media.title?.romaji ?? media.title?.english ?? "Sem título",
      titleEnglish: media.title?.english ?? null,
      image:
        media.coverImage?.extraLarge ??
        media.coverImage?.large ??
        DEFAULT_COVER,
      genres: media.genres ?? [],
      releaseDate: this.toReleaseDate(media),
      // O AniList devolve a nota de 0 a 100; exibimos no formato 0 a 10.
      score: media.averageScore ? media.averageScore / 10 : null,
      popularity: media.popularity ?? null,
      favourites: media.favourites ?? null,
      format: media.format ?? null,
      status: media.status ?? null,
      totalEpisodes: media.episodes ?? null,
    };
  }

  /**
   * Quantos episódios já foram ao ar. Em animes em exibição o total costuma
   * vir nulo, então usamos o próximo episódio agendado como referência.
   */
  private toAvailableEpisodes(media: AnilistMedia): number {
    if (media.nextAiringEpisode?.episode) {
      return Math.max(media.nextAiringEpisode.episode - 1, 0);
    }
    return media.episodes ?? 0;
  }

  /** Episódio já agendado pelo AniList, quando o anime ainda está no ar. */
  private toNextEpisode(media: AnilistMedia): NextEpisodeProps | null {
    const next = media.nextAiringEpisode;
    if (!next?.airingAt) return null;
    return { number: next.episode, airingAt: next.airingAt };
  }

  private toReleaseDate(media: AnilistMedia): string | null {
    if (media.seasonYear) return String(media.seasonYear);
    return media.startDate?.year ? String(media.startDate.year) : null;
  }

  /**
   * Mais populares primeiro. As consultas de mídia já pedem POPULARITY_DESC à
   * API, mas a grade de exibição não aceita esse sort, então garantimos a
   * ordem aqui — dentro da página, que é o que a API entrega por vez.
   */
  private sortByPopularity(animes: AnimeProps[]): AnimeProps[] {
    return [...animes].sort(
      (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
    );
  }

  private dedupe(animes: AnimeProps[]): AnimeProps[] {
    const seen = new Set<string>();
    return animes.filter((anime) => {
      if (seen.has(anime.id)) return false;
      seen.add(anime.id);
      return true;
    });
  }

  private cleanDescription(description?: string | null): string | null {
    if (!description) return null;
    return description
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}

const AnilistService = new AnilistServiceClass();
export default AnilistService;
