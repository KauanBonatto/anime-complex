import { ONE_DAY, createCache } from "@/utils/cache";

/**
 * Tudo o que o site pede ao MangaDex: a sinopse em pt-BR, a lista de
 * capítulos e as páginas de cada um.
 *
 * Este módulo roda SOMENTE no servidor. A API do MangaDex não libera CORS
 * para outros domínios — do browser, a requisição é bloqueada —, e passar por
 * aqui ainda deixa as respostas no Data Cache do Next e na CDN, compartilhadas
 * entre os visitantes. Quem consome é o handler /api/mangadex/[op].
 *
 * A API é pública e não pede chave. Em troca, a política de uso exige crédito
 * ao MangaDex e aos grupos de tradução — no rodapé do site e no do leitor.
 */

const MANGADEX_API = "https://api.mangadex.org";

/** O MangaDex pede que clientes da API se identifiquem pelo User-Agent. */
const USER_AGENT = "anime-complex/0.1";

const REQUEST_TIMEOUT = 10_000;

/** Quantos resultados conferimos antes de desistir do casamento por ID. */
const SEARCH_LIMIT = 5;

/** O feed devolve no máximo 500 capítulos por página... */
const FEED_PAGE_SIZE = 500;
/** ...e recusa qualquer `offset + limit` acima de 10 mil. */
const FEED_MAX_RESULTS = 10_000;

export const MANGA_LANGUAGES: MangaLanguage[] = ["pt-br", "en"];

/** O Data Cache do Next conta em segundos. */
export const MANGADEX_REVALIDATE = {
  /** O casamento AniList → MangaDex e a sinopse praticamente não mudam. */
  search: 24 * 60 * 60,
  /** Capítulos novos saem ao longo do dia. */
  feed: 60 * 60,
  /**
   * O endereço do servidor do MangaDex@Home vale por uns 15 minutos: guardar
   * mais que isso entregaria páginas que já não abrem.
   */
  pages: 5 * 60,
};

interface MangaDexManga {
  id: string;
  attributes?: {
    description?: Record<string, string>;
    links?: Record<string, string> | null;
  };
}

interface MangaDexChapter {
  id: string;
  attributes: {
    volume: string | null;
    chapter: string | null;
    title: string | null;
    translatedLanguage: string;
    externalUrl: string | null;
    isUnavailable?: boolean;
    publishAt: string | null;
    pages: number;
  };
  relationships?: {
    type: string;
    attributes?: { name?: string };
  }[];
}

interface MangaDexFeed {
  data?: MangaDexChapter[];
  total?: number;
}

interface MangaDexAtHome {
  baseUrl: string;
  chapter: { hash: string; data: string[]; dataSaver: string[] };
}

/**
 * Falhas de rede e respostas de erro são propagadas: quem chamou decide, e
 * nada disso pode ir para cache como se fosse "o MangaDex não tem".
 */
const mangadexGet = async <T>(
  path: string,
  params: [string, string | number][],
  revalidate: number
): Promise<T> => {
  const url = new URL(path, MANGADEX_API);
  params.forEach(([key, value]) => url.searchParams.append(key, String(value)));

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    next: { revalidate },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  if (!res.ok) throw new Error(`MangaDex respondeu ${res.status} em ${path}`);
  return (await res.json()) as T;
};

/** O casamento é caro (uma busca por título) e muda raramente. */
const mangaCache = createCache<MangaDexManga | null>({
  namespace: "mangadex:manga",
  ttl: ONE_DAY,
  maxEntries: 500,
});

/**
 * O MangaDex não permite consultar por ID do AniList, só por título — e
 * títulos casam a obra errada com facilidade ("Berserk" traz "Boushoku no
 * Berserk"). Por isso buscamos por nome e só aceitamos o resultado cujo link
 * para o AniList bate com o mangá que estamos exibindo.
 */
const findByAnilistId = (anilistId: string, titles: string[]) =>
  mangaCache.resolve(anilistId, async () => {
    for (const title of Array.from(new Set(titles.filter(Boolean)))) {
      const { data } = await mangadexGet<{ data?: MangaDexManga[] }>(
        "/manga",
        [
          ["limit", SEARCH_LIMIT],
          ["title", title],
          ["order[relevance]", "desc"],
        ],
        MANGADEX_REVALIDATE.search
      );

      const match = data?.find(
        (entry) => String(entry.attributes?.links?.al ?? "") === anilistId
      );
      if (match) return match;
    }
    return null;
  });

/**
 * As descrições do MangaDex são escritas em Markdown e às vezes terminam num
 * bloco de links do grupo de tradução. A ficha mostra texto puro.
 */
const cleanDescription = (description: string): string | null => {
  const text = description
    // Corta o rodapé de links/créditos, separado por uma linha de traços.
    .split(/\n\s*-{3,}\s*\n/)[0]
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text || null;
};

/**
 * Sinopse em pt-BR. Nulo quando a obra não está no MangaDex ou não tem
 * tradução — resposta válida, que vale cache.
 */
export const getPtBrDescription = async (
  anilistId: string,
  titles: string[]
): Promise<string | null> => {
  const manga = await findByAnilistId(anilistId, titles);
  const description = manga?.attributes?.description ?? {};
  const ptBr = description["pt-br"] ?? description["pt"];
  return ptBr ? cleanDescription(ptBr) : null;
};

/** "12.5" → 12.5; sem número, vai para o fim da lista. */
const chapterOrder = (chapter: MangaChapterProps) => {
  const value = parseFloat(chapter.number ?? "");
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
};

const toVersion = (chapter: MangaDexChapter): MangaChapterVersionProps => {
  const groups = (chapter.relationships ?? [])
    .filter((relation) => relation.type === "scanlation_group")
    .map((relation) => relation.attributes?.name)
    .filter((name): name is string => !!name);

  return {
    id: chapter.id,
    group: groups.join(" & ") || null,
    pages: chapter.attributes.pages,
    externalUrl: chapter.attributes.externalUrl,
    publishedAt: chapter.attributes.publishAt,
  };
};

const isReadable = (version: MangaChapterVersionProps) =>
  !version.externalUrl && version.pages > 0;

/**
 * Agrupa as traduções de cada número. A versão padrão é a mais recente das
 * que abrem aqui dentro: reenvios costumam corrigir páginas faltando ou
 * trocar por um scan melhor.
 */
const groupChapters = (chapters: MangaDexChapter[]): MangaChapterProps[] => {
  const byNumber = new Map<string, MangaChapterProps>();

  for (const chapter of chapters) {
    const { chapter: number, volume, title } = chapter.attributes;
    // Sem número (one-shots, extras), cada capítulo é uma entrada própria.
    const key = number ?? `id:${chapter.id}`;
    const entry = byNumber.get(key) ?? {
      number,
      volume,
      title,
      versions: [],
    };
    entry.volume ??= volume;
    entry.title ??= title;
    entry.versions.push(toVersion(chapter));
    byNumber.set(key, entry);
  }

  const grouped = Array.from(byNumber.values());
  grouped.forEach((entry) =>
    entry.versions.sort(
      (a, b) =>
        Number(isReadable(b)) - Number(isReadable(a)) ||
        (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")
    )
  );
  return grouped.sort((a, b) => chapterOrder(a) - chapterOrder(b));
};

const feedParams = (offset: number): [string, string | number][] => [
  ["limit", FEED_PAGE_SIZE],
  ["offset", offset],
  ...MANGA_LANGUAGES.map((lang): [string, string] => ["translatedLanguage[]", lang]),
  ["order[chapter]", "asc"],
  ["includes[]", "scanlation_group"],
  // Sem `includeExternalUrl`: com ele em 1 o feed traz SÓ os capítulos
  // externos, e em 0 esconde os links oficiais que a lista mostra.
];

/**
 * Capítulos em pt-BR e em inglês. Nulo quando a obra não está no MangaDex;
 * listas vazias quando está, mas sem capítulos nesses idiomas (é o caso de boa
 * parte das obras licenciadas).
 */
export const getChapterFeed = async (
  anilistId: string,
  titles: string[]
): Promise<MangaChapterFeedProps | null> => {
  const manga = await findByAnilistId(anilistId, titles);
  if (!manga) return null;

  const path = `/manga/${manga.id}/feed`;
  const first = await mangadexGet<MangaDexFeed>(
    path,
    feedParams(0),
    MANGADEX_REVALIDATE.feed
  );

  // Sabendo o total, o resto das páginas sai em paralelo: obras longas passam
  // de 2 mil capítulos somando os dois idiomas.
  const total = Math.min(first.total ?? 0, FEED_MAX_RESULTS);
  const offsets: number[] = [];
  for (let offset = FEED_PAGE_SIZE; offset < total; offset += FEED_PAGE_SIZE) {
    offsets.push(offset);
  }
  const rest = await Promise.all(
    offsets.map((offset) =>
      mangadexGet<MangaDexFeed>(path, feedParams(offset), MANGADEX_REVALIDATE.feed)
    )
  );

  const all = [first, ...rest]
    .flatMap((page) => page.data ?? [])
    // Removido a pedido do detentor dos direitos e sem link oficial: não há o
    // que abrir.
    .filter((chapter) => !chapter.attributes.isUnavailable || chapter.attributes.externalUrl);

  const chapters = Object.fromEntries(
    MANGA_LANGUAGES.map((lang) => [
      lang,
      groupChapters(all.filter((chapter) => chapter.attributes.translatedLanguage === lang)),
    ])
  ) as Record<MangaLanguage, MangaChapterProps[]>;

  return { mangadexId: manga.id, chapters };
};

/** IDs do MangaDex são UUIDs; qualquer outra coisa nem chega à API. */
export const isMangaDexId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * As páginas não têm endereço fixo: o MangaDex@Home sorteia um servidor da
 * rede a cada pedido, e o endereço vale por alguns minutos.
 */
export const getChapterPages = async (
  chapterId: string,
  { fresh = false } = {}
): Promise<MangaChapterPagesProps | null> => {
  const { baseUrl, chapter } = await mangadexGet<MangaDexAtHome>(
    `/at-home/server/${chapterId}`,
    [],
    // Quem pede `fresh` acabou de ver uma página falhar: o endereço guardado
    // é justamente o que não serve mais.
    fresh ? 0 : MANGADEX_REVALIDATE.pages
  );
  if (!chapter?.data?.length) return null;

  return {
    pages: chapter.data.map((file) => `${baseUrl}/data/${chapter.hash}/${file}`),
    pagesDataSaver: chapter.dataSaver.map(
      (file) => `${baseUrl}/data-saver/${chapter.hash}/${file}`
    ),
  };
};
