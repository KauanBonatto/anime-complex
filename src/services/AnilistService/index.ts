import {
  ANIME_DETAILS_QUERY,
  FRANCHISE_QUERY,
  POPULAR_ANIME_QUERY,
  RECENT_ANIME_QUERY,
  RECENT_EPISODES_QUERY,
  SEARCH_ANIME_QUERY,
} from "./queries";
import { AnilistMedia, AnilistPage } from "./types";
import {
  DEFAULT_COVER,
  EMPTY_RESPONSE,
  anilistRequest,
  genresKey,
} from "./client";
import { cleanDescription, formatLabel } from "@/utils/anime";
import { ONE_HOUR, createCache } from "@/utils/cache";

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
  namespace: "anilist:list:v3",
  ttl: LIST_TTL,
  persist: true,
});

/** Fichas completas, usadas pela página do anime e pela do episódio. */
const detailsCache = createCache<AnimeDetailsProps | null>({
  // O sufixo muda junto com o formato da ficha: fichas guardadas antes de um
  // campo novo existir seguiriam válidas por uma hora, sem ele.
  namespace: "anilist:details:v5",
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

/**
 * Temporadas de uma franquia. Montar a lista custa uma requisição por elo, e o
 * resultado é o mesmo para qualquer temporada da mesma sequência — por isso
 * vale a pena persistir.
 */
const franchiseCache = createCache<FranchiseSeasonProps[]>({
  namespace: "anilist:franchise:v1",
  ttl: LIST_TTL,
  persist: true,
});

/**
 * Só estas relações continuam a mesma história. `SIDE_STORY` e `ALTERNATIVE`
 * trariam spin-offs e recontagens para o meio da lista de temporadas.
 */
const SEASON_RELATIONS = new Set(["PREQUEL", "SEQUEL", "PARENT"]);

/**
 * Teto de elos visitados. Cada um é uma requisição, e o AniList permite 90 por
 * minuto por IP — franquias muito longas param aqui em vez de gastar a cota.
 */
const MAX_FRANCHISE_NODES = 8;

/** Formatos que contam como temporada numerada; o resto vira "Filme", "OVA"... */
const NUMBERED_FORMATS = new Set(["TV", "TV_SHORT"]);

class AnilistServiceClass {
  private request = anilistRequest;

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

  /**
   * Temporadas da franquia, em ordem cronológica. O AniList trata cada
   * temporada como uma obra independente, então a sequência inteira só aparece
   * percorrendo as relações de prequela/sequência a partir da obra aberta.
   *
   * Sempre chame isto depois de a ficha já ter renderizado: são várias
   * requisições encadeadas e nenhuma tela deve esperar por elas.
   */
  async getFranchiseSeasons(
    anilistId: string | number
  ): Promise<FranchiseSeasonProps[]> {
    const id = Number(anilistId);
    if (!id) return [];

    return franchiseCache.resolve(
      `franchise:${id}`,
      () => this.fetchFranchiseSeasons(id),
      { shouldStore: (seasons) => seasons.length > 0 }
    );
  }

  /**
   * Busca em largura pela cadeia da franquia. Cada elo custa uma requisição, e
   * o percurso para no teto de nós — o que já foi encontrado é devolvido do
   * mesmo jeito, porque uma lista parcial ainda navega melhor que nenhuma.
   */
  private async fetchFranchiseSeasons(
    rootId: number
  ): Promise<FranchiseSeasonProps[]> {
    const visited = new Set<number>([rootId]);
    const queue: number[] = [rootId];
    const nodes: AnilistMedia[] = [];

    while (queue.length && visited.size <= MAX_FRANCHISE_NODES) {
      const currentId = queue.shift();
      if (currentId === undefined) break;

      const data = await this.request<{ Media: AnilistMedia }>(FRANCHISE_QUERY, {
        id: currentId,
      });
      const media = data?.Media;
      if (!media) continue;

      nodes.push(media);

      for (const edge of media.relations?.edges ?? []) {
        const neighbourId = edge?.node?.id;
        if (!neighbourId || visited.has(neighbourId)) continue;
        if (!SEASON_RELATIONS.has(edge.relationType ?? "")) continue;
        // As relações também apontam para mangás; só nos interessa a animação.
        if (edge.node?.type && edge.node.type !== "ANIME") continue;

        visited.add(neighbourId);
        queue.push(neighbourId);
      }
    }

    // Uma obra sozinha não é uma franquia: a tela usa o vazio para não montar
    // o seletor de temporadas à toa.
    if (nodes.length < 2) return [];

    return this.toFranchiseSeasons(nodes, rootId);
  }

  private toFranchiseSeasons(
    nodes: AnilistMedia[],
    currentId: number
  ): FranchiseSeasonProps[] {
    const year = (media: AnilistMedia) =>
      media.seasonYear ?? media.startDate?.year ?? null;

    const ordered = [...nodes].sort(
      (a, b) => (year(a) ?? Infinity) - (year(b) ?? Infinity)
    );

    // Só as séries entram na numeração; filmes e OVAs ficam com o formato como
    // rótulo, para não empurrar a contagem das temporadas de verdade.
    let seasonNumber = 0;

    return ordered.map((media) => {
      const isNumbered = NUMBERED_FORMATS.has(media.format ?? "");
      if (isNumbered) seasonNumber += 1;

      return {
        id: String(media.id),
        title: media.title?.romaji ?? media.title?.english ?? "Sem título",
        label: isNumbered
          ? `Temporada ${seasonNumber}`
          : formatLabel(media.format) ?? "Especial",
        year: year(media),
        format: media.format ?? null,
        cover: media.coverImage?.large ?? null,
        totalEpisodes: media.episodes ?? 0,
        isCurrent: media.id === currentId,
      };
    });
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
      description: cleanDescription(media.description),
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
      episodes: this.toEpisodes(media),
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
      titleNative: media.title?.native ?? null,
      startDate: this.toStartDate(media),
      image:
        media.coverImage?.extraLarge ??
        media.coverImage?.large ??
        DEFAULT_COVER,
      bannerImage: media.bannerImage ?? null,
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
   * Episódios que o AniList conhece, aceitando qualquer serviço de streaming:
   * o rótulo é o mesmo em todos e o que interessa aqui é a cobertura. Só uma
   * janela dos episódios das séries longas está cadastrada, então essa lista é
   * incompleta de propósito — o TMDB completa o resto em pt-BR, e a tela cai no
   * número puro para o que sobrar.
   *
   * Uma entrada vale a pena mesmo sem título, desde que traga a imagem.
   */
  private toEpisodes(media: AnilistMedia): Record<number, EpisodeInfoProps> {
    const episodes: Record<number, EpisodeInfoProps> = {};

    for (const streaming of media.streamingEpisodes ?? []) {
      const parsed = this.parseStreamingEpisode(streaming.title);
      if (!parsed) continue;

      const thumbnail = streaming.thumbnail?.trim();
      if (!parsed.title && !thumbnail) continue;

      // O primeiro registro vence: os repetidos costumam ser dublagens.
      const current = episodes[parsed.number];
      if (current?.title && current.thumbnail) continue;

      episodes[parsed.number] = {
        number: parsed.number,
        title: current?.title ?? parsed.title,
        thumbnail:
          current?.thumbnail ?? (thumbnail ? this.toSecureUrl(thumbnail) : null),
        airedAt: null,
        duration: media.duration ?? null,
        overview: null,
      };
    }

    return episodes;
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

  /**
   * Data de estreia completa, quando o AniList tem o dia. É a âncora que
   * identifica a obra no TMDB quando ela não está na tabela de equivalência:
   * um episódio que foi ao ar exatamente nesse dia dificilmente é de outra
   * série. Uma data pela metade não serve para isso, então vira nulo.
   */
  private toStartDate(media: AnilistMedia): string | null {
    const { year, month, day } = media.startDate ?? {};
    if (!year || !month || !day) return null;

    const doisDigitos = (valor: number) => String(valor).padStart(2, "0");
    return `${year}-${doisDigitos(month)}-${doisDigitos(day)}`;
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
}

const AnilistService = new AnilistServiceClass();
export default AnilistService;
