interface ResponseApiProps {
  currentPage: number;
  hasNextPage: boolean;
  results: AnimeProps[];
}

interface AnimeProps {
  id: string;
  malId?: number | null;
  episodeNumber?: number;
  airedAt?: number | null;
  title: string;
  titleEnglish?: string | null;
  image: string;
  /** Arte deitada. Só vem nas listas que pedem por ela. */
  bannerImage?: string | null;
  genres?: string[];
  releaseDate?: string | null;
  /** Nota média da comunidade, normalizada de 0 a 10. */
  score?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  format?: string | null;
  status?: string | null;
  totalEpisodes?: number | null;
  /** Só em mangás: capítulos e volumes publicados. */
  totalChapters?: number | null;
  totalVolumes?: number | null;
}

/** Qual catálogo a lista exibe: muda o link do card e a linha de metadados. */
type MediaType = "anime" | "manga";

interface AnimeGridProps {
  title: string;
  loading: boolean;
  animeData: ResponseApiProps;
  getAnimeData: (pageNumber: number) => Promise<void>;
  /** Muda sempre que os filtros mudam, para voltar à primeira página. */
  resetToken?: string;
  emptyMessage?: string;
  /** Padrão: "anime". */
  media?: MediaType;
  /** Padrão: "poster". "release" usa o card horizontal de episódio recente. */
  variant?: AnimeCardVariant;
}

/**
 * Como o card do catálogo se apresenta. "poster" é a capa vertical de sempre;
 * "release" é o card horizontal usado em "Episódios Recentes", que dá destaque
 * ao número do episódio e ao horário em que ele foi ao ar.
 */
type AnimeCardVariant = "poster" | "release";

/** Ficha completa vinda do AniList (dados + avaliação). */
interface AnimeDetailsProps extends AnimeProps {
  description: string | null;
  bannerImage: string | null;
  season: string | null;
  seasonYear: number | null;
  studios: string[];
  siteUrl: string | null;
  malUrl: string | null;
  duration: number | null;
  rankings: AnimeRankingProps[];
  /** Trailer oficial, quando o AniList tem um cadastrado. */
  trailer: AnimeTrailerProps | null;
  /** Onde assistir oficialmente na Crunchyroll, quando o anime está lá. */
  crunchyroll: CrunchyrollProps | null;
  /** Dados de cada episódio conhecido, por número. */
  episodes: Record<number, EpisodeInfoProps>;
  /** Episódios já exibidos, base para montar a lista de episódios. */
  availableEpisodes: number;
  /** Só existe em animes em exibição ou ainda não lançados. */
  nextEpisode: NextEpisodeProps | null;
}

/**
 * Um episódio da obra. O AniList entrega título e thumbnail apenas dos
 * episódios que tem cadastrados em `streamingEpisodes` — uma janela pequena
 * nas séries longas — e o TMDB completa o resto já em pt-BR.
 */
interface EpisodeInfoProps {
  number: number;
  title: string | null;
  thumbnail: string | null;
  /** Epoch em segundos, quando a fonte conhece a data de exibição. */
  airedAt: number | null;
  /** Minutos. Cai para a duração média da série quando não há valor próprio. */
  duration: number | null;
  overview: string | null;
}

/**
 * Uma temporada da franquia. No AniList cada temporada é uma obra separada,
 * com ID próprio, então a lista é montada percorrendo as relações de sequência.
 */
interface FranchiseSeasonProps {
  id: string;
  title: string;
  /** "Temporada 2", "Filme", "OVA" — vem da ordem e do formato. */
  label: string;
  year: number | null;
  format: string | null;
  cover: string | null;
  totalEpisodes: number;
  /** Verdadeiro na temporada que está aberta na tela. */
  isCurrent: boolean;
}

/** Trailer do AniList, já convertido em endereço de embed. */
interface AnimeTrailerProps {
  /** URL pronta para o iframe, no player do YouTube ou do Dailymotion. */
  embedUrl: string;
  /** Capa exibida antes de o player carregar. */
  thumbnail: string | null;
  siteLabel: string;
}

/** Catálogo do anime na Crunchyroll, montado a partir do AniList. */
interface CrunchyrollProps {
  /** Página da série, usada quando o episódio específico não está listado. */
  seriesUrl: string | null;
  /** Link direto de cada episódio que o AniList conhece, por número. */
  episodeUrls: Record<number, string>;
}

/** Endereço da Crunchyroll escolhido para um episódio. */
interface CrunchyrollLinkProps {
  url: string;
  /** Falso quando o link leva à série, e não ao episódio pedido. */
  isEpisode: boolean;
}

/** Próximo episódio agendado, com o horário em segundos (epoch). */
interface NextEpisodeProps {
  number: number;
  airingAt: number;
}

/** Retorno do SugoiAPI: players encontrados para um episódio. */
interface EpisodeProviderProps {
  name: string;
  slug: string;
  hasAds: boolean;
  isEmbed: boolean;
  /** Playlist HLS, que precisa do hls.js fora do Safari. */
  isHls?: boolean;
  /** Player que não roda embutido aqui: vira link para uma aba nova. */
  isExternal?: boolean;
  url: string;
}

interface AnimeRankingProps {
  rank: number;
  type: string;
  context: string;
  allTime: boolean;
}
