import axios from "axios";

/**
 * Ponte para o handler /api/synopsis, que é quem fala com o TMDB. O AniList só
 * tem sinopse em inglês, então trocamos a descrição pela versão em pt-BR
 * quando existe uma.
 */
const synopsisApi = axios.create({ baseURL: "/api/synopsis" });

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
    const description = await this.getPtBrDescription(anime);
    return description ? { ...anime, description } : anime;
  }

  private async getPtBrDescription(
    anime: AnimeDetailsProps
  ): Promise<string | null> {
    try {
      const { data } = await synopsisApi.get<SynopsisResponse>(`/${anime.id}`, {
        params: {
          title: anime.title,
          titleEnglish: anime.titleEnglish ?? undefined,
          year: anime.seasonYear ?? anime.releaseDate ?? undefined,
          format: anime.format ?? undefined,
        },
      });
      return data?.description ?? null;
    } catch (err) {
      return null;
    }
  }
}

const TmdbService = new TmdbServiceClass();
export default TmdbService;
