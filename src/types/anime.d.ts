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
  genres?: string[];
  releaseDate?: string | null;
  /** Nota média da comunidade, normalizada de 0 a 10. */
  score?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  format?: string | null;
  status?: string | null;
  totalEpisodes?: number | null;
}

interface AnimeGridProps {
  title: string;
  loading: boolean;
  animeData: ResponseApiProps;
  getAnimeData: (pageNumber: number) => Promise<void>;
  /** Muda sempre que os filtros mudam, para voltar à primeira página. */
  resetToken?: string;
  emptyMessage?: string;
}

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
  /** Episódios já exibidos, base para montar a lista de episódios. */
  availableEpisodes: number;
  /** Só existe em animes em exibição ou ainda não lançados. */
  nextEpisode: NextEpisodeProps | null;
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
  url: string;
}

interface AnimeRankingProps {
  rank: number;
  type: string;
  context: string;
  allTime: boolean;
}
