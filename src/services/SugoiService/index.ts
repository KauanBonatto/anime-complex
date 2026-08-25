import { animeSlugCandidates } from "@/utils/anime";
import axios from "axios";

/**
 * Os providers do SugoiAPI ignoram a temporada na maior parte dos casos e o
 * AniList já trata cada temporada como um anime separado.
 */
const DEFAULT_SEASON = 1;

const sugoiApi = axios.create({ baseURL: "/api/episode" });

interface EpisodeResponse {
  providers: EpisodeProviderProps[];
  unavailable?: boolean;
}

class SugoiServiceClass {
  /**
   * Busca os players de um episódio. Tenta os títulos conhecidos do anime até
   * um deles bater com o slug usado pelos providers.
   */
  async getEpisodeProviders(
    anime: AnimeProps,
    episodeNumber: number
  ): Promise<EpisodeProviderProps[]> {
    for (const slug of animeSlugCandidates(anime)) {
      const providers = await this.searchBySlug(slug, episodeNumber);
      if (providers.length) return providers;
    }
    return [];
  }

  private async searchBySlug(
    slug: string,
    episodeNumber: number
  ): Promise<EpisodeProviderProps[]> {
    try {
      const { data } = await sugoiApi.get<EpisodeResponse>(
        `/${slug}/${DEFAULT_SEASON}/${episodeNumber}`
      );
      return data?.providers ?? [];
    } catch (err) {
      return [];
    }
  }
}

const SugoiService = new SugoiServiceClass();
export default SugoiService;
