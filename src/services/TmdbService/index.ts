import { ONE_DAY, createCache } from "@/utils/cache";
import axios from "axios";

/**
 * Ponte para o handler /api/synopsis, que é quem fala com o TMDB. O AniList só
 * tem sinopse em inglês, então trocamos a descrição pela versão em pt-BR
 * quando existe uma.
 */
const synopsisApi = axios.create({ baseURL: "/api/synopsis" });

/**
 * Sinopse é texto fixo: uma vez traduzida, não muda. Guardamos por um dia no
 * browser para não repetir a chamada a cada visita à ficha do anime — o TMDB
 * limita as requisições por chave, e esse cache é o que evita gastá-las
 * reabrindo a mesma página.
 */
const descriptionCache = createCache<string | null>({
  namespace: "tmdb:synopsis",
  ttl: ONE_DAY,
  persist: true,
});

interface SynopsisResponse {
  description: string | null;
  title: string | null;
  source: "tmdb" | null;
}

class TmdbServiceClass {
  /**
   * Devolve a ficha com a sinopse em pt-BR. Se o TMDB não tiver tradução, a
   * descrição original do AniList é mantida — ela é mais completa que a versão
   * em inglês do TMDB.
   *
   * O título não é substituído de propósito: a busca de episódios no SugoiAPI
   * usa `title`/`titleEnglish` para montar o slug do provider.
   */
  async localizeDescription(
    anime: AnimeDetailsProps
  ): Promise<AnimeDetailsProps> {
    // Uma falha na busca não vira cache: o fetch abaixo propaga o erro e o
    // catch daqui mantém a descrição em inglês só nesta visita.
    const description = await descriptionCache
      .resolve(anime.id, () => this.fetchPtBrDescription(anime))
      .catch(() => null);
    return description ? { ...anime, description } : anime;
  }

  /**
   * Devolve nulo quando o TMDB não tem tradução — esse "não tem" é resposta
   * válida e vale cache. Erros de rede são propagados para não virarem cache.
   */
  private async fetchPtBrDescription(
    anime: AnimeDetailsProps
  ): Promise<string | null> {
    const { data } = await synopsisApi.get<SynopsisResponse>(`/${anime.id}`, {
      params: {
        title: anime.title,
        titleEnglish: anime.titleEnglish ?? undefined,
        year: anime.seasonYear ?? anime.releaseDate ?? undefined,
        format: anime.format ?? undefined,
      },
    });
    return data?.description ?? null;
  }
}

const TmdbService = new TmdbServiceClass();
export default TmdbService;
