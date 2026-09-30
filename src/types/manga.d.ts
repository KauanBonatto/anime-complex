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

/** Idiomas de capítulo que o leitor oferece, em ordem de preferência. */
type MangaLanguage = "pt-br" | "en";

/**
 * Uma tradução de um capítulo. O mesmo número costuma ter várias no MangaDex,
 * uma por grupo de scan.
 */
interface MangaChapterVersionProps {
  /** ID do capítulo no MangaDex: é o que o leitor usa na rota. */
  id: string;
  group: string | null;
  pages: number;
  /**
   * Obras licenciadas só apontam para o site oficial (MangaPlus e afins): o
   * MangaDex não hospeda as páginas, e o capítulo não abre no leitor.
   */
  externalUrl: string | null;
  publishedAt: string | null;
}

interface MangaChapterProps {
  /** Nulo em one-shots e extras sem numeração. */
  number: string | null;
  volume: string | null;
  title: string | null;
  /** A primeira é a que o leitor abre por padrão. */
  versions: MangaChapterVersionProps[];
}

interface MangaChapterFeedProps {
  mangadexId: string;
  chapters: Record<MangaLanguage, MangaChapterProps[]>;
}

/** Páginas de um capítulo, já com as URLs completas do MangaDex@Home. */
interface MangaChapterPagesProps {
  pages: string[];
  /** Versão comprimida das mesmas páginas, para economizar dados. */
  pagesDataSaver: string[];
}
