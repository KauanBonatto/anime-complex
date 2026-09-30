import { ONE_DAY, ONE_HOUR, createCache } from "@/utils/cache";

/**
 * O lado do browser do MangaDex: sinopses em pt-BR (o AniList só tem
 * descrição em inglês e o TMDB, que traduz as fichas de anime, não cataloga
 * mangás), a lista de capítulos e as páginas do leitor.
 *
 * Tudo passa pelo /api/mangadex/[op]: a API do MangaDex não libera CORS para
 * outros domínios, e do servidor as respostas ainda ficam na CDN para todos.
 */

/**
 * Sinopse é texto fixo: uma vez traduzida, não muda. Um dia de cache no
 * browser evita repetir a busca a cada visita à ficha.
 */
const descriptionCache = createCache<string | null>({
  // O sufixo separa das entradas gravadas quando a busca saía do browser e
  // falhava por CORS — elas ficaram guardadas como "sem tradução".
  namespace: "mangadex:description:v2",
  ttl: ONE_DAY,
  persist: true,
});

/**
 * A lista de capítulos fica só em memória: obras longas passam de 2 mil
 * capítulos, e isso encheria o localStorage. A CDN já responde rápido.
 */
const feedCache = createCache<MangaChapterFeedProps | null>({
  namespace: "mangadex:feed",
  ttl: ONE_HOUR,
  maxEntries: 10,
});

/** O endereço das páginas vence em uns 15 minutos; guardamos bem menos. */
const PAGES_TTL = 5 * 60 * 1000;

const pagesCache = createCache<MangaChapterPagesProps | null>({
  namespace: "mangadex:pages",
  ttl: PAGES_TTL,
  maxEntries: 20,
});

/** Falha de rede vira exceção, para não ir para cache como "não tem". */
const fromServer = async <T>(op: string, params: Record<string, string>) => {
  const res = await fetch(`/api/mangadex/${op}?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`/api/mangadex/${op} respondeu ${res.status}`);
  return (await res.json()) as T;
};

const mangaParams = (manga: MangaDetailsProps) => {
  const params: Record<string, string> = { id: manga.id, title: manga.title };
  if (manga.titleEnglish && manga.titleEnglish !== manga.title) {
    params.titleEnglish = manga.titleEnglish;
  }
  return params;
};

class MangaDexServiceClass {
  /**
   * Devolve a ficha com a sinopse em pt-BR. Sem tradução — ou sem a obra no
   * MangaDex — a descrição em inglês do AniList é mantida.
   */
  async localizeDescription(
    manga: MangaDetailsProps
  ): Promise<MangaDetailsProps> {
    // Uma falha de rede não vira cache: o fetch propaga o erro e o catch daqui
    // mantém a descrição em inglês só nesta visita.
    const description = await descriptionCache
      .resolve(manga.id, () =>
        fromServer<string | null>("description", mangaParams(manga))
      )
      .catch(() => null);

    return description ? { ...manga, description } : manga;
  }

  /**
   * Capítulos em pt-BR e em inglês. Nulo quando a obra não está no MangaDex;
   * rejeita em falha de rede, para a tela poder oferecer uma nova tentativa.
   */
  getChapterFeed(manga: MangaDetailsProps) {
    return feedCache.resolve(manga.id, () =>
      fromServer<MangaChapterFeedProps | null>("chapters", mangaParams(manga))
    );
  }

  /**
   * `fresh` ignora o cache: é o que o leitor pede quando uma imagem falha,
   * sinal de que o servidor do MangaDex@Home sorteado saiu do ar ou venceu.
   */
  getChapterPages(chapterId: string, { fresh = false } = {}) {
    if (!fresh) {
      return pagesCache.resolve(chapterId, () =>
        fromServer<MangaChapterPagesProps | null>("pages", { chapter: chapterId })
      );
    }

    // O `fresh` também passa pela URL: sem ele a CDN devolveria o mesmo
    // endereço que acabou de falhar.
    return fromServer<MangaChapterPagesProps | null>("pages", {
      chapter: chapterId,
      fresh: "1",
    }).then((pages) => {
      pagesCache.set(chapterId, pages);
      return pages;
    });
  }
}

const MangaDexService = new MangaDexServiceClass();
export default MangaDexService;
