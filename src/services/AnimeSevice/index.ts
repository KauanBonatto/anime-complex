import { apiService } from "../ApiService";

class AnimeServiceClass {
  async getAnimeBySearch(search: string, page: number = 1): Promise<ResponseApiProps> {
    const { data } = await apiService.get(`/${search}`, { params: { page } });
    return data;
  }

  async getRecentEpisodesAnime(page: number = 1, type: number = 1): Promise<ResponseApiProps> {
    const { data } = await apiService.get("/recent-episodes", { params: { page, type } });
    return data;
  }

  async getTopAiringAnime(page: number = 1): Promise<ResponseApiProps> {
    const { data } = await apiService.get("/top-airing", { params: { page } });
    return data;
  }

  async getAnimeEpisodeByEpisodeId(episodeId: string): Promise<ResponseApiProps> {
    const { data } = await apiService.get(`/servers/${episodeId}`);
    return data;
  }
}

const AnimeService = new AnimeServiceClass();
export default AnimeService;