import AnilistService from "@/services/AnilistService";
import { animeSlugCandidates, continuousEpisodeCandidates } from "@/utils/anime";
import axios from "axios";

/**
 * Os providers do SugoiAPI ignoram a temporada na maior parte dos casos e o
 * AniList já trata cada temporada como um anime separado.
 */
const DEFAULT_SEASON = 1;

/**
 * Providers que a busca tenta completar. Cada site escreve o título do seu
 * jeito, então um slug que acerta um deles pode errar os outros — e só vale
 * insistir enquanto algum ainda não achou o episódio.
 *
 * O AnimeFire guarda as partes de uma temporada numa página só, com a conta
 * corrida da série: a Ketsubetsu-tan ep 5 só é achada lá como "bleach" ep 384,
 * que é a última tentativa da numeração contínua.
 */
const PROVIDERS = ["animes-online-cc", "anime-fire", "top-animes"];

const sugoiApi = axios.create({ baseURL: "/api/episode" });

interface EpisodeResponse {
  providers: EpisodeProviderProps[];
  unavailable?: boolean;
}

interface Attempt {
  slug: string;
  episode: number;
}

class SugoiServiceClass {
  /**
   * Busca os players de um episódio, somando o que cada tentativa encontra:
   * primeiro os títulos do anime, depois — só para os providers que ainda não
   * acharam nada — a numeração contínua das partes anteriores da temporada.
   */
  async getEpisodeProviders(
    anime: AnimeProps,
    episodeNumber: number
  ): Promise<EpisodeProviderProps[]> {
    const found: EpisodeProviderProps[] = [];

    const titles = animeSlugCandidates(anime).map((slug) => ({
      slug,
      episode: episodeNumber,
    }));
    for (const attempt of titles) {
      if (!(await this.complete(found, attempt))) return found;
    }

    // As temporadas já foram pedidas pela tela do episódio e costumam estar em
    // cache; sem elas não há deslocamento para calcular.
    const seasons = await AnilistService.getFranchiseSeasons(anime.id).catch(
      () => []
    );
    for (const attempt of continuousEpisodeCandidates(
      anime,
      seasons,
      episodeNumber
    )) {
      if (!(await this.complete(found, attempt))) return found;
    }

    return found;
  }

  /**
   * Procura a tentativa nos providers que ainda faltam e acrescenta o que vier.
   * Devolve se ainda sobrou algum provider sem player.
   */
  private async complete(
    found: EpisodeProviderProps[],
    attempt: Attempt
  ): Promise<boolean> {
    const missing = this.missing(found);
    if (!missing.length) return false;

    // Na primeira tentativa vão todos numa chamada só, como antes.
    const results = found.length
      ? await Promise.all(
          missing.map((provider) => this.search(attempt, provider))
        )
      : [await this.search(attempt)];

    const known = new Set(found.map((provider) => provider.url));
    for (const provider of results.flat()) {
      if (known.has(provider.url)) continue;
      known.add(provider.url);
      found.push(provider);
    }

    return this.missing(found).length > 0;
  }

  private missing(found: EpisodeProviderProps[]): string[] {
    const present = new Set(found.map((provider) => provider.slug));
    return PROVIDERS.filter((provider) => !present.has(provider));
  }

  private async search(
    { slug, episode }: Attempt,
    provider?: string
  ): Promise<EpisodeProviderProps[]> {
    try {
      const { data } = await sugoiApi.get<EpisodeResponse>(
        `/${slug}/${DEFAULT_SEASON}/${episode}`,
        { params: provider ? { provider } : undefined }
      );
      return data?.providers ?? [];
    } catch (err) {
      return [];
    }
  }
}

const SugoiService = new SugoiServiceClass();
export default SugoiService;
