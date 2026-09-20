import { animeSlugCandidates } from "@/utils/anime";
import axios from "axios";

/**
 * Provider servido pelo Jellyfin do AniStream. Diferente do SugoiAPI, que
 * raspa sites de terceiros, aqui a fonte é uma biblioteca própria: cada
 * episódio é um item do Jellyfin, e o player toca a playlist HLS que ele gera.
 *
 * Toda a conversa com o Jellyfin — busca do item, PlaybackInfo, credenciais —
 * acontece no servidor (rota /api/anistream), porque o ApiKey é um segredo da
 * conta e não pode chegar ao browser.
 */
const anistreamApi = axios.create({ baseURL: "/api/anistream/episode" });

interface EpisodeResponse {
  providers: EpisodeProviderProps[];
}

class AnistreamServiceClass {
  /**
   * Busca o player do episódio no AniStream. Envia os títulos conhecidos do
   * anime como candidatos: o servidor procura a série por cada um até achar a
   * que existe na biblioteca. Devolve vazio quando o provider está desligado
   * (sem credenciais) ou quando a obra não está no catálogo.
   */
  async getEpisodeProviders(
    anime: AnimeProps,
    episodeNumber: number
  ): Promise<EpisodeProviderProps[]> {
    const titles = anistreamTitleCandidates(anime);
    if (!titles.length || !episodeNumber) return [];

    try {
      const { data } = await anistreamApi.get<EpisodeResponse>("", {
        params: { title: titles, episode: episodeNumber },
        // O axios repete a chave (?title=a&title=b) em vez de mandar um array.
        paramsSerializer: { indexes: null },
      });
      return data?.providers ?? [];
    } catch (err) {
      return [];
    }
  }
}

/**
 * Candidatos de título para casar com o nome da série no Jellyfin. Reaproveita
 * os mesmos títulos que o Sugoi usa, mais os originais crus (sem virar slug),
 * porque a busca do Jellyfin é textual e lida bem com o nome como ele é.
 */
const anistreamTitleCandidates = (anime: AnimeProps): string[] => {
  const raw = [anime.title, anime.titleEnglish, anime.titleNative].filter(
    (title): title is string => !!title
  );
  return Array.from(new Set([...raw, ...animeSlugCandidates(anime)]));
};

const AnistreamService = new AnistreamServiceClass();
export default AnistreamService;
