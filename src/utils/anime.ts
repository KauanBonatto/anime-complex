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

/** A sinopse do AniList vem com HTML no meio; a tela mostra texto puro. */
export const cleanDescription = (
  description?: string | null
): string | null => {
  if (!description) return null;
  return description
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

/** Chip de ranking da ficha: "#3 melhor avaliado de todos os tempos". */
export const rankLabel = (ranking: AnimeRankingProps) =>
  `#${ranking.rank} ${
    ranking.type === "RATED" ? "melhor avaliado" : "mais popular"
  } de todos os tempos`;

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

/**
 * Endereço da Crunchyroll para um episódio. Quando o AniList não lista aquele
 * episódio (comum em séries longas, que só têm uma janela cadastrada), o link
 * cai na página da série — ainda leva o usuário ao lugar certo.
 */
export const crunchyrollEpisodeLink = (
  crunchyroll: CrunchyrollProps | null | undefined,
  episodeNumber: number
): CrunchyrollLinkProps | null => {
  const episodeUrl = crunchyroll?.episodeUrls?.[episodeNumber];
  if (episodeUrl) return { url: episodeUrl, isEpisode: true };

  if (crunchyroll?.seriesUrl) {
    return { url: crunchyroll.seriesUrl, isEpisode: false };
  }

  return null;
};

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

/** "19:00" — só a hora do lançamento, no fuso do usuário. */
export const airingTimeLabel = (airingAt: number) =>
  new Date(airingAt * 1000).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

/** Identifica o dia local de uma data — é por ele que o calendário agrupa. */
const localDayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

/**
 * Cabeçalho de um dia do calendário: "Hoje", "Amanhã" ou "sex., 26 de set.".
 *
 * Os dois primeiros existem porque é neles que está quase toda a atenção de
 * quem abre a home — e um dia da semana solto obrigaria a conferir o calendário
 * do sistema para saber se já é hoje.
 */
export const upcomingDayLabel = (airingAt: number, reference = new Date()) => {
  const date = new Date(airingAt * 1000);

  const tomorrow = new Date(reference);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (localDayKey(date) === localDayKey(reference)) return "Hoje";
  if (localDayKey(date) === localDayKey(tomorrow)) return "Amanhã";

  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

/**
 * Monta o calendário: um grupo por dia, do mais próximo ao mais distante, e
 * dentro de cada dia as obras mais populares na frente.
 *
 * A ordem é dividida assim de propósito. Ordenar a faixa inteira por
 * popularidade jogaria o lançamento de daqui a uma hora para o fim da lista; só
 * por horário, o dia seria aberto por séries que quase ninguém acompanha. O
 * agrupamento por dia é o que deixa os dois critérios conviverem.
 *
 * O dia é o dia de quem está olhando: um episódio que sai 01:00 no Japão cai em
 * dias diferentes conforme o fuso, e é por isso que o agrupamento não vem
 * pronto do serviço.
 */
export const groupUpcomingByDay = (
  episodes: UpcomingEpisodeProps[]
): UpcomingDayProps[] => {
  const days: UpcomingDayProps[] = [];
  const byKey = new Map<string, UpcomingDayProps>();

  for (const episode of [...episodes].sort((a, b) => a.airingAt - b.airingAt)) {
    const key = localDayKey(new Date(episode.airingAt * 1000));
    const day = byKey.get(key);

    if (day) {
      day.episodes.push(episode);
      continue;
    }

    // A lista já vem em ordem cronológica, então a ordem em que os dias
    // aparecem pela primeira vez é a ordem do calendário.
    const novo: UpcomingDayProps = {
      key,
      label: upcomingDayLabel(episode.airingAt),
      episodes: [episode],
    };
    byKey.set(key, novo);
    days.push(novo);
  }

  for (const day of days) {
    day.episodes.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  }

  return days;
};

/** Embaralhamento de Fisher-Yates, sobre uma cópia. */
const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Obras para o destaque da home: metade do catálogo popular, metade da grade
 * de exibição, embaralhadas.
 *
 * A divisão é feita antes do sorteio de propósito — sortear sobre a soma das
 * duas listas devolveria quase sempre só populares, porque essa lista chega
 * primeiro e costuma ser a maior. Quando uma das fontes não enche a cota, a
 * outra completa.
 */
export const pickHighlights = (
  popular: AnimeProps[],
  recent: AnimeProps[],
  max: number
): AnimeProps[] => {
  const seen = new Set<string>();
  const take = (list: AnimeProps[], limit: number) => {
    const picked: AnimeProps[] = [];
    if (limit <= 0) return picked;

    for (const anime of shuffle(list)) {
      if (picked.length >= limit) break;
      // Uma obra em exibição também é popular; sem isto ela poderia aparecer
      // duas vezes no mesmo carrossel.
      if (seen.has(anime.id)) continue;
      seen.add(anime.id);
      picked.push(anime);
    }
    return picked;
  };

  const fromPopular = take(popular, Math.ceil(max / 2));
  const fromRecent = take(recent, max - fromPopular.length);
  const sobra = take(popular, max - fromPopular.length - fromRecent.length);

  return shuffle([...fromPopular, ...fromRecent, ...sobra]);
};

/**
 * "21 de setembro de 2025" — a data de exibição de um episódio.
 *
 * Formatada em UTC de propósito. O TMDB informa uma data de calendário, sem
 * horário, que o servidor converte para a meia-noite UTC; renderizá-la no fuso
 * do visitante jogaria todo mundo a oeste de Greenwich para o dia anterior.
 */
export const episodeDateLabel = (airedAt: number) =>
  new Date(airedAt * 1000).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * "12 de outubro de 2025" — quando o episódio foi ao ar, no fuso do usuário.
 *
 * Não usa o episodeDateLabel de propósito: lá a fonte é uma data de calendário
 * do TMDB, sem horário, que precisa ser lida em UTC para não recuar um dia;
 * aqui o valor é um instante real da grade de exibição do AniList, e o fuso de
 * quem assiste é justamente o que interessa.
 */
export const airedDateLabel = (airedAt: number) =>
  new Date(airedAt * 1000).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Quanto tempo faz, em texto curto: "há 3 h", "há 2 dias". Usado na lista de
 * episódios recentes, onde a data exata importa menos que a sensação de
 * novidade — por isso uma unidade só.
 */
export const timeAgoLabel = (airedAt: number) => {
  const seconds = Math.floor(Date.now() / 1000) - airedAt;
  if (seconds < 60) return "agora";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} ${days === 1 ? "dia" : "dias"}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `há ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;

  const years = Math.floor(days / 365);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
};

/** "24 min" — a duração de um episódio. */
export const durationLabel = (minutes?: number | null) =>
  minutes && minutes > 0 ? `${minutes} min` : null;

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
