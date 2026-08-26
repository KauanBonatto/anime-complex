import axios from "axios";
import {
  ANIME_DETAILS_QUERY,
  POPULAR_ANIME_QUERY,
  RECENT_ANIME_QUERY,
  RECENT_EPISODES_QUERY,
  SEARCH_ANIME_QUERY,
} from "./queries";
import { AnilistMedia, AnilistPage } from "./types";
import { ONE_HOUR, createCache } from "@/utils/cache";

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

/**
 * Catálogo e fichas mudam devagar — uma temporada nova por trimestre, notas
 * que oscilam em casas decimais. Uma hora de cache deixa a navegação
 * instantânea e mantém o consumo do rate limit do AniList (90 requisições por
 * minuto por IP) bem longe do teto.
 */
const LIST_TTL = ONE_HOUR;

/** Listas paginadas: populares, recentes e buscas. */
const listCache = createCache<ResponseApiProps>({
  namespace: "anilist:list",
  ttl: LIST_TTL,
  persist: true,
});

/** Fichas completas, usadas pela página do anime e pela do episódio. */
const detailsCache = createCache<AnimeDetailsProps | null>({
  // O sufixo muda junto com o formato da ficha: fichas guardadas antes de um
  // campo novo existir seguiriam válidas por uma hora, sem ele.
  namespace: "anilist:details:v3",
  ttl: LIST_TTL,
  persist: true,
});

/**
 * A janela de episódios recentes é grande (150 registros) e alimenta todas as
 * páginas da lista, então fica só em memória para não ocupar o storage.
 */
const airingWindowCache = createCache<AnimeProps[]>({
  namespace: "anilist:airing-window",
  ttl: LIST_TTL,
  maxEntries: 1,
});

const AIRING_WINDOW_KEY = "current";

/** Chave estável: a ordem dos gêneros escolhidos não pode mudar o cache. */
const genresKey = (genres: string[]) => [...genres].sort().join(",");

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
    const key = `popular:${page}:${genresKey(genres)}`;
    return this.cachedList(key, async () => {
      const data = await this.request<{ Page: AnilistPage }>(
        POPULAR_ANIME_QUERY,
        { page, perPage: PER_PAGE, genres: genres.length ? genres : undefined }
      );
      return this.toResponse(data?.Page, page);
    });
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
      const key = `recent:${page}:${genresKey(genres)}`;
      return this.cachedList(key, async () => {
        const data = await this.request<{ Page: AnilistPage }>(
          RECENT_ANIME_QUERY,
          { page, perPage: PER_PAGE, genres }
        );
        return this.toResponse(data?.Page, page);
      });
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

  /** Janela de episódios recentes já ordenada por popularidade, com cache. */
  private async getRecentEpisodesWindow(): Promise<AnimeProps[]> {
    return airingWindowCache.resolve(
      AIRING_WINDOW_KEY,
      () => this.fetchRecentEpisodesWindow(),
      { shouldStore: (episodes) => episodes.length > 0 }
    );
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

    return this.sortByPopularity(this.dedupe(results));
  }

  async getAnimeBySearch(
    search: string,
    page: number = 1,
    genres: string[] = []
  ): Promise<ResponseApiProps> {
    const term = search.trim();
    if (!term) return EMPTY_RESPONSE;

    const key = `search:${term.toLowerCase()}:${page}:${genresKey(genres)}`;
    return this.cachedList(key, async () => {
      const data = await this.request<{ Page: AnilistPage }>(
        SEARCH_ANIME_QUERY,
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

  async getAnimeDetails(
    anilistId: string | number
  ): Promise<AnimeDetailsProps | null> {
    const id = Number(anilistId);
    if (!id) return null;

    return detailsCache.resolve(
      `details:${id}`,
      () => this.fetchAnimeDetails(id),
      // Uma falha de rede não pode esconder o anime pela hora seguinte.
      { shouldStore: (details) => details !== null }
    );
  }

  private async fetchAnimeDetails(
    id: number
  ): Promise<AnimeDetailsProps | null> {
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
      trailer: this.toTrailer(media),
      crunchyroll: this.toCrunchyroll(media),
      episodeTitles: this.toEpisodeTitles(media),
      availableEpisodes: this.toAvailableEpisodes(media),
      nextEpisode: this.toNextEpisode(media),
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

  /**
   * O AniList guarda só o id do vídeo e o site onde ele está hospedado, então
   * montamos aqui o endereço de embed. Ignoramos sites desconhecidos: sem um
   * player conhecido não há como incorporar o vídeo.
   */
  private toTrailer(media: AnilistMedia): AnimeTrailerProps | null {
    // Vários registros do AniList têm espaços e tabs colados no id (e no
    // thumbnail montado a partir dele), o que quebraria a URL do player.
    const id = media.trailer?.id?.trim();
    if (!id) return null;

    const site = media.trailer?.site?.trim().toLowerCase();

    if (site === "youtube") {
      return {
        // O domínio nocookie evita o rastreamento do YouTube em quem só abre a
        // ficha do anime; `rel=0` mantém as sugestões do fim dentro do canal.
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        siteLabel: "YouTube",
      };
    }

    if (site === "dailymotion") {
      return {
        embedUrl: `https://www.dailymotion.com/embed/video/${id}`,
        thumbnail: media.trailer?.thumbnail?.trim() || null,
        siteLabel: "Dailymotion",
      };
    }

    return null;
  }

  /**
   * A Crunchyroll aparece no AniList em dois lugares: `externalLinks` traz a
   * página da série e `streamingEpisodes` traz o link direto de cada episódio
   * ("Episode 12 - ..."), que é o que abre o vídeo já selecionado. A lista de
   * episódios costuma cobrir só uma parte das temporadas longas, por isso a
   * página da série continua guardada como plano B.
   */
  private toCrunchyroll(media: AnilistMedia): CrunchyrollProps | null {
    const isCrunchyroll = (site?: string | null) =>
      site?.trim().toLowerCase() === "crunchyroll";

    const seriesLink = media.externalLinks?.find(
      (link) => isCrunchyroll(link.site) && !!link.url
    );

    const episodeUrls: Record<number, string> = {};
    for (const episode of media.streamingEpisodes ?? []) {
      if (!isCrunchyroll(episode.site) || !episode.url) continue;

      const number = this.parseStreamingEpisode(episode.title)?.number;
      // O primeiro link vence: episódios repetidos costumam ser dublagens.
      if (number && !episodeUrls[number]) {
        episodeUrls[number] = this.toSecureUrl(episode.url);
      }
    }

    const seriesUrl = seriesLink?.url
      ? this.toSecureUrl(seriesLink.url)
      : null;

    if (!seriesUrl && !Object.keys(episodeUrls).length) return null;

    return { seriesUrl, episodeUrls };
  }

  /**
   * "Episode 12 - Título" -> { number: 12, title: "Título" }. O AniList escreve
   * o rótulo assim tanto nos links da Crunchyroll quanto nos dos outros
   * serviços; sem número reconhecível a entrada é descartada.
   */
  private parseStreamingEpisode(
    label?: string | null
  ): { number: number; title: string | null } | null {
    const match = label?.match(
      /(?:epis[oó]dio|episode|ep\.?)\s*0*(\d+)\s*(?:[-–—:]\s*(.+))?$/i
    );
    if (!match) return null;

    return { number: Number(match[1]), title: match[2]?.trim() || null };
  }

  /**
   * Títulos dos episódios, aceitando qualquer serviço de streaming: o texto é
   * o mesmo em todos e o que interessa aqui é a cobertura. O AniList só
   * cadastra uma janela de episódios das séries longas, então o título nem
   * sempre existe — a página cai só no número quando falta.
   */
  private toEpisodeTitles(media: AnilistMedia): Record<number, string> {
    const titles: Record<number, string> = {};

    for (const episode of media.streamingEpisodes ?? []) {
      const parsed = this.parseStreamingEpisode(episode.title);
      if (parsed?.title && !titles[parsed.number]) {
        titles[parsed.number] = parsed.title;
      }
    }

    return titles;
  }

  /** O AniList ainda guarda vários links da Crunchyroll em http. */
  private toSecureUrl(url: string): string {
    return url.trim().replace(/^http:\/\//i, "https://");
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
