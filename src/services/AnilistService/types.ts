export interface AnilistFuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface AnilistMedia {
  id: number;
  idMal: number | null;
  title: {
    romaji: string | null;
    english: string | null;
  };
  coverImage: {
    large: string | null;
    extraLarge: string | null;
  };
  averageScore: number | null;
  popularity: number | null;
  favourites: number | null;
  genres: string[] | null;
  format: string | null;
  status: string | null;
  episodes: number | null;
  startDate: AnilistFuzzyDate | null;
  isAdult?: boolean;
  bannerImage?: string | null;
  duration?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  siteUrl?: string | null;
  description?: string | null;
  studios?: { nodes: { name: string }[] };
  trailer?: {
    id: string | null;
    site: string | null;
    thumbnail: string | null;
  } | null;
  rankings?: AnimeRankingProps[];
  externalLinks?: {
    site: string | null;
    url: string | null;
    type: string | null;
  }[] | null;
  streamingEpisodes?: {
    title: string | null;
    url: string | null;
    site: string | null;
    thumbnail?: string | null;
  }[] | null;
  relations?: {
    edges: AnilistRelationEdge[] | null;
  } | null;
  nextAiringEpisode?: {
    episode: number;
    airingAt: number;
    timeUntilAiring: number;
  } | null;
}

/** Uma relação entre obras: sequência, prequela, adaptação, spin-off... */
export interface AnilistRelationEdge {
  relationType: string | null;
  node: {
    id: number;
    type?: string | null;
  } | null;
}

export interface AnilistAiringSchedule {
  episode: number;
  airingAt: number;
  media: AnilistMedia;
}

export interface AnilistPage {
  pageInfo: {
    currentPage: number;
    hasNextPage: boolean;
  };
  media?: AnilistMedia[];
  airingSchedules?: AnilistAiringSchedule[];
}
