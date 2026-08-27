/** Ficha completa de um mangá vinda do AniList (dados + avaliação). */
interface MangaDetailsProps extends AnimeProps {
  description: string | null;
  bannerImage: string | null;
  siteUrl: string | null;
  malUrl: string | null;
  rankings: AnimeRankingProps[];
  /** Autores e ilustradores creditados pelo AniList. */
  authors: string[];
  startYear: number | null;
  /** Nulo enquanto a obra está em publicação. */
  endYear: number | null;
}
