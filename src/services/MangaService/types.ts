import { AnilistFuzzyDate } from "../AnilistService/types";

export interface AnilistManga {
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
  chapters: number | null;
  volumes: number | null;
  startDate: AnilistFuzzyDate | null;
  endDate?: AnilistFuzzyDate | null;
  bannerImage?: string | null;
  siteUrl?: string | null;
  description?: string | null;
  rankings?: AnimeRankingProps[];
  staff?: {
    edges: {
      role: string | null;
      node: { name: { full: string | null } } | null;
    }[];
  } | null;
}

export interface AnilistMangaPage {
  pageInfo: {
    currentPage: number;
    hasNextPage: boolean;
  };
  media?: AnilistManga[];
}
