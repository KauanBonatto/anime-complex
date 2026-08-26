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

/**
 * O Top Animes não devolve um player, e sim uma página que embrulha o vídeo, e
 * cada episódio pode vir num formato diferente. Há quatro no ar hoje.
 *
 * Dois escondem a playlist e só o servidor consegue chegar nela, então passam
 * pelo /api/stream:
 *
 * - `/antivirus…`: checa o `document.referrer` e, fora do domínio deles, troca
 *   o próprio endereço pela home — era o que engolia o vídeo no nosso iframe;
 * - `sk-api.alibabacdn.net`: busca as fontes com `mode=api2`, de uma origem que
 *   não libera CORS para nós.
 */
const WRAPPED_PLAYERS = ["topanimes.net/antivirus", "sk-api.alibabacdn.net"];

/**
 * Os outros dois carregam o endereço real no próprio link, então basta abrir o
 * embrulho: `/aviso/?url=` é uma sala de espera na frente de um player de
 * terceiros, e `videohls.php?d=` é uma tela de anúncios na frente de um m3u8.
 */
const WRAPPER_PARAMS: Record<string, string> = {
  "topanimes.net/aviso": "url",
  "anivideo.net/videohls": "d",
};

const isWrappedPlayer = (url: string) =>
  WRAPPED_PLAYERS.some((wrapper) => url.includes(wrapper));

const unwrapPlayer = (url: string) => {
  const wrapper = Object.keys(WRAPPER_PARAMS).find((key) => url.includes(key));
  if (!wrapper) return url;

  try {
    return new URL(url).searchParams.get(WRAPPER_PARAMS[wrapper]) ?? url;
  } catch {
    return url;
  }
};

/** Achata a resposta do SugoiAPI em uma lista simples de players válidos. */
const toProviders = (data: SugoiProvider[] = []): EpisodeProviderProps[] =>
  (data ?? []).flatMap((provider) =>
    (provider.episodes ?? [])
      .filter((episode) => !episode.error && !!episode.episode)
      .map((episode) => {
        const url = unwrapPlayer(episode.episode as string);
        const proxied = isWrappedPlayer(url);
        // Playlist que o browser alcança sozinho, sem intermédio nenhum.
        const direct = url.includes(".m3u8");

        return {
          name: provider.name,
          slug: provider.slug,
          hasAds: provider.has_ads,
          // Deixa de ser embed: agora é uma playlist tocada no nosso player.
          isEmbed: provider.is_embed && !proxied && !direct,
          isHls: proxied || direct,
          url: proxied ? `/api/stream?src=${encodeURIComponent(url)}` : url,
        };
      })
  );
