/** Traduções dos campos que chegam do AniList em inglês. */

const FORMAT_LABELS: Record<string, string> = {
  TV: "Série",
  TV_SHORT: "Curta",
  MOVIE: "Filme",
  SPECIAL: "Especial",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Clipe",
};

const STATUS_LABELS: Record<string, string> = {
  RELEASING: "Em exibição",
  FINISHED: "Finalizado",
  NOT_YET_RELEASED: "Ainda não lançado",
  CANCELLED: "Cancelado",
  HIATUS: "Em hiato",
};

const SEASON_LABELS: Record<string, string> = {
  WINTER: "Inverno",
  SPRING: "Primavera",
  SUMMER: "Verão",
  FALL: "Outono",
};

export const GENRE_LABELS: Record<string, string> = {
  Action: "Ação",
  Adventure: "Aventura",
  Comedy: "Comédia",
  Drama: "Drama",
  Fantasy: "Fantasia",
  Horror: "Terror",
  "Mahou Shoujo": "Mahou Shoujo",
  Mecha: "Mecha",
  Music: "Música",
  Mystery: "Mistério",
  Psychological: "Psicológico",
  Romance: "Romance",
  "Sci-Fi": "Ficção científica",
  "Slice of Life": "Slice of Life",
  Sports: "Esportes",
  Supernatural: "Sobrenatural",
  Thriller: "Suspense",
};

export const formatLabel = (format?: string | null) =>
  format ? FORMAT_LABELS[format] ?? format : null;

export const statusLabel = (status?: string | null) =>
  status ? STATUS_LABELS[status] ?? status : null;

export const seasonLabel = (season?: string | null) =>
  season ? SEASON_LABELS[season] ?? season : null;

export const genreLabel = (genre: string) => GENRE_LABELS[genre] ?? genre;

/** Monta a linha de metadados do card: "2023 · Série · 28 eps". */
export const animeMetaLine = (anime: AnimeProps) =>
  [
    anime.releaseDate,
    formatLabel(anime.format),
    anime.totalEpisodes ? `${anime.totalEpisodes} eps` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * Converte um título em slug no formato usado pelos providers do SugoiAPI.
 * Ex.: "HUNTER×HUNTER (2011)" -> "hunter-x-hunter-2011".
 */
export const animeSlug = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00d7/g, "-x-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Títulos alternativos aumentam a chance de achar o anime no provider. */
export const animeSlugCandidates = (anime: AnimeProps) =>
  Array.from(
    new Set(
      [anime.title, anime.titleEnglish]
        .filter((title): title is string => !!title)
        .map(animeSlug)
        .filter(Boolean)
    )
  );

/** "sexta-feira, 29 de agosto às 13:00" — no fuso do usuário. */
export const airingDateLabel = (airingAt: number) => {
  const date = new Date(airingAt * 1000);
  const day = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hour = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} às ${hour}`;
};

/**
 * Tempo restante em texto: "2 dias e 5 horas", "5 horas e 30 minutos".
 * Os minutos só aparecem quando falta menos de um dia, para não poluir.
 */
export const timeUntilLabel = (seconds: number) => {
  if (seconds <= 0) return "Lançando agora";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [
    days ? `${days} ${days === 1 ? "dia" : "dias"}` : null,
    hours ? `${hours} ${hours === 1 ? "hora" : "horas"}` : null,
    !days && minutes ? `${minutes} ${minutes === 1 ? "minuto" : "minutos"}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" e ") : "menos de um minuto";
};
