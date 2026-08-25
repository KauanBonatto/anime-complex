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
  rankings?: AnimeRankingProps[];
  nextAiringEpisode?: {
    episode: number;
    airingAt: number;
    timeUntilAiring: number;
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
