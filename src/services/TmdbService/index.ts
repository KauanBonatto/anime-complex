import { ONE_DAY, createCache } from "@/utils/cache";
import axios from "axios";
import type { TmdbEpisode } from "./server";

/**
 * Ponte para o handler /api/synopsis, que é quem fala com o TMDB. O AniList só
 * tem sinopse em inglês e dados de episódio em inglês, então trocamos os dois
 * pela versão em pt-BR quando ela existe.
 */
const synopsisApi = axios.create({ baseURL: "/api/synopsis" });

/** O que o TMDB acrescenta à ficha do AniList, tudo em pt-BR. */
interface LocalizedAnime {
  description: string | null;
  episodes: Record<number, TmdbEpisode>;
}

/**
 * Sinopse e dados de episódio são conteúdo fixo: uma vez traduzidos, não mudam.
 * Guardamos por um dia no browser para não repetir a chamada a cada visita à
 * ficha ou a cada episódio aberto — o TMDB limita as requisições por chave, e
 * esse cache é o que evita gastá-las reabrindo as mesmas páginas.
 */
const localizedCache = createCache<LocalizedAnime>({
  // O sufixo muda junto com o formato: fichas guardadas antes de os episódios
  // trazerem imagem e data seguiriam válidas por um dia, sem ele.
  namespace: "tmdb:localized:v3",
  ttl: ONE_DAY,
  persist: true,
});

interface SynopsisResponse {
  description: string | null;
  title: string | null;
  episodes: Record<number, TmdbEpisode> | null;
  source: "tmdb" | null;
}

const EMPTY: LocalizedAnime = { description: null, episodes: {} };

class TmdbServiceClass {
  /**
   * Devolve a ficha com a sinopse e os episódios em pt-BR. Sem tradução, a
   * descrição original do AniList é mantida — ela é mais completa que a versão
   * em inglês do TMDB.
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
      episodes: this.mergeEpisodes(anime, localized.episodes),
    };
  }

  /**
   * As duas fontes se completam: o AniList cadastra só uma janela dos episódios
   * das séries longas, e o TMDB cobre a temporada inteira. O merge é campo a
   * campo porque cada fonte é forte em algo diferente — o TMDB tem a tradução,
   * a data e a duração; o AniList costuma ter imagem justamente nos episódios
   * recentes, que o TMDB ainda não ilustrou.
   */
  private mergeEpisodes(
    anime: AnimeDetailsProps,
    localized: Record<number, TmdbEpisode>
  ): Record<number, EpisodeInfoProps> {
    const numbers = new Set([
      ...Object.keys(anime.episodes ?? {}),
      ...Object.keys(localized),
    ]);

    const merged: Record<number, EpisodeInfoProps> = {};
    for (const key of Array.from(numbers)) {
      const number = Number(key);
      if (!number) continue;

      const fromAnilist = anime.episodes?.[number];
      const fromTmdb = localized[number];

      merged[number] = {
        number,
        title: fromTmdb?.title ?? fromAnilist?.title ?? null,
        thumbnail: fromTmdb?.thumbnail ?? fromAnilist?.thumbnail ?? null,
        airedAt: fromTmdb?.airedAt ?? fromAnilist?.airedAt ?? null,
        // A duração do TMDB é do episódio; a do AniList é a média da série.
        duration: fromTmdb?.duration ?? fromAnilist?.duration ?? anime.duration,
        overview: fromTmdb?.overview ?? fromAnilist?.overview ?? null,
      };
    }

    return merged;
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
      episodes: data?.episodes ?? {},
    };
  }
}

const TmdbService = new TmdbServiceClass();
export default TmdbService;
