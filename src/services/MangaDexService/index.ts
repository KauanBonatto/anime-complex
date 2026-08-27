import { ONE_DAY, createCache } from "@/utils/cache";
import axios from "axios";

/**
 * Sinopses de mangá em pt-BR, vindas do MangaDex — o AniList só tem descrição
 * em inglês e o TMDB, que traduz as fichas de anime, não cataloga mangás.
 *
 * A API é pública e não pede chave. Em troca, a política de uso exige crédito
 * ao MangaDex e aos grupos de tradução, que fica no rodapé do site.
 */
const mangadexApi = axios.create({ baseURL: "https://api.mangadex.org" });

/** Quantos resultados conferimos antes de desistir do casamento por ID. */
const SEARCH_LIMIT = 5;

/**
 * Sinopse é texto fixo: uma vez traduzida, não muda. Um dia de cache no
 * browser evita repetir a busca a cada visita à ficha.
 */
const descriptionCache = createCache<string | null>({
  namespace: "mangadex:description",
  ttl: ONE_DAY,
  persist: true,
});

interface MangaDexManga {
  attributes?: {
    description?: Record<string, string>;
    links?: Record<string, string>;
  };
}

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
      .resolve(manga.id, () => this.fetchPtBrDescription(manga))
      .catch(() => null);

    return description ? { ...manga, description } : manga;
  }

  /**
   * Devolve nulo quando não há tradução — esse "não tem" é resposta válida e
   * vale cache. Erros de rede são propagados para não virarem cache.
   */
  private async fetchPtBrDescription(
    manga: MangaDetailsProps
  ): Promise<string | null> {
    const titles = Array.from(
      new Set([manga.title, manga.titleEnglish].filter((title): title is string => !!title))
    );

    for (const title of titles) {
      const match = await this.findByAnilistId(title, manga.id);
      if (!match) continue;

      // Achamos a obra certa: se ela não tem tradução, procurar pelo outro
      // título só devolveria o mesmo registro.
      const description = match.attributes?.description ?? {};
      const ptBr = description["pt-br"] ?? description["pt"];
      return ptBr ? cleanDescription(ptBr) : null;
    }

    return null;
  }

  /**
   * O MangaDex não permite consultar por ID do AniList, só por título — e
   * títulos casam a obra errada com facilidade ("Berserk" traz "Boushoku no
   * Berserk"). Por isso buscamos por nome e só aceitamos o resultado cujo link
   * para o AniList bate com o mangá que estamos exibindo.
   */
  private async findByAnilistId(
    title: string,
    anilistId: string
  ): Promise<MangaDexManga | null> {
    const { data } = await mangadexApi.get<{ data?: MangaDexManga[] }>(
      "/manga",
      { params: { limit: SEARCH_LIMIT, title } }
    );

    return (
      data?.data?.find(
        (entry) => String(entry.attributes?.links?.al ?? "") === anilistId
      ) ?? null
    );
  }
}

const MangaDexService = new MangaDexServiceClass();
export default MangaDexService;
