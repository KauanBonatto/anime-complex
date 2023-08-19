import { apiService } from "../ApiService";

class AnimeServiceClass {
  async getAnimeBySearch(
    search: string,
    page: number = 1
  ): Promise<ResponseApiProps> {
    const { data } = await apiService.get(`/${search}`, { params: { page } });
    return data;
  }

  async getRecentEpisodesAnime(
    page: number = 1,
    type: number = 1
  ): Promise<ResponseApiProps> {
    const { data } = await apiService.get("/recent-episodes", {
      params: { page, type },
    });
    return data;
  }

  async getTopAiringAnime(page: number = 1): Promise<ResponseApiProps> {
    const { data } = await apiService.get("/top-airing", { params: { page } });
    return data;
  }

  async getAnimeInfo(animeId: string): Promise<AnimeInfoProps | undefined> {
    try {
      const { data } = await apiService.get(`/info/${animeId}`);
      return data;
    } catch (err) {
      return;
    }
  }

  async getAnimeEpisodeByEpisodeId(
    episodeId: string
  ): Promise<AnimeEpisodeInfoProps> {
    const { data } = await apiService.get(`/watch/${episodeId}`);
    return data;
  }

  async getAnimeServersByEpisodeId(
    episodeId: string
  ): Promise<ResponseApiProps> {
    const { data } = await apiService.get(`/servers/${episodeId}`);
    return data;
  }
}

const AnimeService = new AnimeServiceClass();
export default AnimeService;