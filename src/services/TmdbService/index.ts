import { ONE_DAY, createCache } from "@/utils/cache";
import axios from "axios";

/**
 * Ponte para o handler /api/synopsis, que é quem fala com o TMDB. O AniList só
 * tem sinopse em inglês e nomes de episódio em inglês, então trocamos os dois
 * pela versão em pt-BR quando ela existe.
 */
const synopsisApi = axios.create({ baseURL: "/api/synopsis" });

/** O que o TMDB acrescenta à ficha do AniList, tudo em pt-BR. */
interface LocalizedAnime {
  description: string | null;
  episodeTitles: Record<number, string>;
}

/**
 * Sinopse e nome de episódio são texto fixo: uma vez traduzidos, não mudam.
 * Guardamos por um dia no browser para não repetir a chamada a cada visita à
 * ficha ou a cada episódio aberto — o TMDB limita as requisições por chave, e
 * esse cache é o que evita gastá-las reabrindo as mesmas páginas.
 */
const localizedCache = createCache<LocalizedAnime>({
  // O sufixo muda junto com o formato: fichas guardadas antes de os episódios
  // existirem seguiriam válidas por um dia, sem ele.
  namespace: "tmdb:localized:v2",
  ttl: ONE_DAY,
  persist: true,
});

interface SynopsisResponse {
  description: string | null;
  title: string | null;
  episodeTitles: Record<number, string> | null;
  source: "tmdb" | null;
}

const EMPTY: LocalizedAnime = { description: null, episodeTitles: {} };

class TmdbServiceClass {
  /**
   * Devolve a ficha com a sinopse e os nomes de episódio em pt-BR. Sem
   * tradução, a descrição original do AniList é mantida — ela é mais completa
   * que a versão em inglês do TMDB.
   *
   * O título não é substituído de propósito: a busca de episódios no SugoiAPI
   * usa `title`/`titleEnglish` para montar o slug do provider.
   */
  async localize(anime: AnimeDetailsProps): Promise<AnimeDetailsProps> {
    // Uma falha na busca não vira cache: o fetch abaixo propaga o erro e o
    // catch daqui mantém o texto em inglês só nesta visita.
    const localized = await localizedCache
      .resolve(anime.id, () => this.fetchPtBr(anime))
      .catch(() => EMPTY);

    return {
      ...anime,
      description: localized.description ?? anime.description,
      // O AniList cobre só uma janela de episódios das séries longas, então as
      // duas fontes se completam — a tradução do TMDB é que vence.
      episodeTitles: { ...anime.episodeTitles, ...localized.episodeTitles },
    };
  }

  /**
   * Devolve campos nulos/vazios quando o TMDB não tem tradução — esse "não
   * tem" é resposta válida e vale cache. Erros de rede são propagados para não
   * virarem cache.
   */
  private async fetchPtBr(anime: AnimeDetailsProps): Promise<LocalizedAnime> {
    const { data } = await synopsisApi.get<SynopsisResponse>(`/${anime.id}`, {
      params: {
        title: anime.title,
        titleEnglish: anime.titleEnglish ?? undefined,
        year: anime.seasonYear ?? anime.releaseDate ?? undefined,
        format: anime.format ?? undefined,
      },
    });

    return {
      description: data?.description ?? null,
      episodeTitles: data?.episodeTitles ?? {},
    };
  }
}

const TmdbService = new TmdbServiceClass();
export default TmdbService;
