/**
 * Traduções dos campos de mangá. O AniList usa a mesma taxonomia de gêneros
 * de anime — por isso `GENRE_LABELS` é reaproveitado —, mas os formatos são
 * outros e o status precisa de outra palavra: um mangá é publicado, não
 * exibido.
 */

const MANGA_FORMAT_LABELS: Record<string, string> = {
  MANGA: "Mangá",
  NOVEL: "Light novel",
  ONE_SHOT: "One-shot",
};

const MANGA_STATUS_LABELS: Record<string, string> = {
  RELEASING: "Em publicação",
  FINISHED: "Finalizado",
  NOT_YET_RELEASED: "Ainda não lançado",
  CANCELLED: "Cancelado",
  HIATUS: "Em hiato",
};

export const mangaFormatLabel = (format?: string | null) =>
  format ? MANGA_FORMAT_LABELS[format] ?? format : null;

export const mangaStatusLabel = (status?: string | null) =>
  status ? MANGA_STATUS_LABELS[status] ?? status : null;

/** Linha de metadados do card: "2023 · Mangá · 120 caps". */
export const mangaMetaLine = (manga: AnimeProps) =>
  [
    manga.releaseDate,
    mangaFormatLabel(manga.format),
    manga.totalChapters ? `${manga.totalChapters} caps` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/** "2019 - 2023", "2023 - atual" ou só o ano de início. */
export const publicationYearsLabel = (
  startYear?: number | null,
  endYear?: number | null,
  status?: string | null
) => {
  if (!startYear) return null;
  if (endYear) return startYear === endYear ? String(startYear) : `${startYear} - ${endYear}`;
  return status === "RELEASING" ? `${startYear} - atual` : String(startYear);
};
