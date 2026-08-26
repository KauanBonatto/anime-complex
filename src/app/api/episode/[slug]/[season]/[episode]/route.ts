import {
  hidesReferrer,
  isWrappedPlayer,
  listEpisodePlayers,
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

  try {
    const response = await fetch(sugoiUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      return NextResponse.json({ providers: [] }, { status: 200 });
    }

    const body = await response.json();
    return NextResponse.json({ providers: await toProviders(body?.data) });
  } catch (err) {
    return NextResponse.json(
      { providers: [], unavailable: true },
      { status: 200 }
    );
  }
}

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
    hasAds: provider.has_ads,
    // Deixa de ser embed: agora é uma playlist tocada no nosso player.
    isEmbed: provider.is_embed && !proxied && !direct,
    isHls: proxied || direct,
    hideReferrer: hidesReferrer(url),
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
  const fallback = () =>
    episodes.map((episode) => toProvider(provider, episode.episode as string));

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
