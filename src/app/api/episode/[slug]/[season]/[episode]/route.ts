import { createCache } from "@/utils/cache";
import {
  isOfflinePlayer,
  isWrappedPlayer,
  refusesSandbox,
  listEpisodePlayers,
  showsAds,
  unwrapPlayer,
} from "@/utils/topAnimes";
import { NextResponse } from "next/server";

/**
 * O SugoiAPI roda localmente e não devolve headers de CORS, então o browser
 * não consegue chamá-lo direto. Este handler faz o intermédio no servidor.
 */
const SUGOI_API_URL = process.env.SUGOI_API_URL ?? "http://localhost:1010";

// Os providers fazem scraping de sites externos e podem demorar.
const REQUEST_TIMEOUT = 45_000;

/**
 * Montar esta lista é caro: o SugoiAPI raspa três sites e, no Top Animes, ainda
 * baixamos a página do episódio e testamos cada player que ela oferece. O
 * usuário, enquanto isso, vai e volta entre episódios o tempo todo.
 *
 * Quinze minutos cortam essa repetição sem servir link vencido: o que expira
 * mais rápido nas respostas são os tokens dos vídeos diretos, e esses duram
 * cerca de três horas.
 */
const PLAYERS_TTL = 15 * 60 * 1000;

interface EpisodeResult {
  providers: EpisodeProviderProps[];
  unavailable?: boolean;
}

const playersCache = createCache<EpisodeResult>({
  namespace: "episode-players",
  ttl: PLAYERS_TTL,
  maxEntries: 200,
});

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  {
    params,
  }: { params: { slug: string; season: string; episode: string } }
) {
  const { slug, season, episode } = params;
  const providerFilter = new URL(request.url).searchParams.get("provider");

  const sugoiUrl = new URL(
    `/episode/${encodeURIComponent(slug)}/${encodeURIComponent(
      season
    )}/${encodeURIComponent(episode)}`,
    SUGOI_API_URL
  );
  // Sem os providers que falharam, só o que dá para assistir de fato.
  sugoiUrl.searchParams.set("ignore_on_fail", "true");
  if (providerFilter) sugoiUrl.searchParams.set("provider", providerFilter);

  // Uma lista vazia costuma ser o provider fora do ar, e não um episódio sem
  // player: guardá-la deixaria a tela vazia até o cache vencer.
  const result = await playersCache.resolve(
    `${slug}/${season}/${episode}/${providerFilter ?? ""}`,
    () => searchEpisode(sugoiUrl),
    { shouldStore: ({ providers }) => providers.length > 0 }
  );

  return NextResponse.json(result);
}

const searchEpisode = async (sugoiUrl: URL): Promise<EpisodeResult> => {
  try {
    const response = await fetch(sugoiUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) return { providers: [] };

    const body = await response.json();
    return { providers: await toProviders(body?.data) };
  } catch (err) {
    return { providers: [], unavailable: true };
  }
};

interface SugoiEpisode {
  error: boolean;
  searched_endpoint: string;
  episode: string | null;
}

interface SugoiProvider {
  name: string;
  slug: string;
  has_ads: boolean;
  is_embed: boolean;
  episodes: SugoiEpisode[];
}

const TOP_ANIMES = "top-animes";

/** Traduz um endereço de player no que o nosso player sabe tocar. */
const toProvider = (
  provider: SugoiProvider,
  rawUrl: string,
  label?: string | null
): EpisodeProviderProps => {
  const url = unwrapPlayer(rawUrl);
  const proxied = isWrappedPlayer(url);
  // Playlist que o browser alcança sozinho, sem intermédio nenhum.
  const direct = url.includes(".m3u8");

  return {
    name: label ? `${provider.name} (${label})` : provider.name,
    slug: provider.slug,
    hasAds: provider.has_ads || showsAds(url),
    // Deixa de ser embed: agora é uma playlist tocada no nosso player.
    isEmbed: provider.is_embed && !proxied && !direct,
    isHls: proxied || direct,
    isExternal: refusesSandbox(url),
    url: proxied ? `/api/stream?src=${encodeURIComponent(url)}` : url,
  };
};

const validEpisodes = (provider: SugoiProvider) =>
  (provider.episodes ?? []).filter(
    (episode) => !episode.error && !!episode.episode
  );

/**
 * A API entrega um player por provider. No Top Animes isso é pouco: a página do
 * episódio costuma ter vários, e é comum o primeiro estar fora do ar enquanto os
 * outros funcionam. Para esse a gente lê a página e oferece a lista inteira.
 */
const expandProvider = async (
  provider: SugoiProvider
): Promise<EpisodeProviderProps[]> => {
  const episodes = validEpisodes(provider);
  /**
   * A API não distingue um player de um aviso de que o player caiu, então o
   * endereço cru dela pode ser a própria página de "está offline" — que não
   * pode virar botão nem quando é tudo o que sobrou.
   */
  const fallback = () =>
    episodes
      .map((episode) => episode.episode as string)
      .filter((url) => !isOfflinePlayer(url))
      .map((url) => toProvider(provider, url));

  if (provider.slug !== TOP_ANIMES || !episodes.length) return fallback();

  try {
    const players = await listEpisodePlayers(episodes[0].searched_endpoint);
    return players.length
      ? players.map(({ label, url }) => toProvider(provider, url, label))
      : fallback();
  } catch (err) {
    return fallback();
  }
};

/** Achata a resposta do SugoiAPI em uma lista simples de players válidos. */
const toProviders = async (
  data: SugoiProvider[] = []
): Promise<EpisodeProviderProps[]> =>
  (await Promise.all((data ?? []).map(expandProvider))).flat();
