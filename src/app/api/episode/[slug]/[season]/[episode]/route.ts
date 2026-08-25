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
    return NextResponse.json({ providers: toProviders(body?.data) });
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

/** Achata a resposta do SugoiAPI em uma lista simples de players válidos. */
const toProviders = (data: SugoiProvider[] = []): EpisodeProviderProps[] =>
  (data ?? []).flatMap((provider) =>
    (provider.episodes ?? [])
      .filter((episode) => !episode.error && !!episode.episode)
      .map((episode) => ({
        name: provider.name,
        slug: provider.slug,
        hasAds: provider.has_ads,
        isEmbed: provider.is_embed,
        url: episode.episode as string,
      }))
  );
