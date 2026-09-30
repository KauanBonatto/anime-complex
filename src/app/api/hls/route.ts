import { parseRelaySource, relayUrl } from "@/utils/hlsRelay";

/**
 * Repassa o HLS do AnimeFire. O CDN dele (akumast.net) só libera CORS para o
 * animefire.one, e o hls.js baixa playlist e segmentos por XHR: sem este
 * intermédio o browser bloqueia tudo antes do primeiro quadro. O token do CDN
 * não depende de IP nem de Referer, então buscar daqui funciona.
 *
 * As playlists são reescritas para que as variantes e os segmentos também
 * passem por aqui; os segmentos (fMP4 com extensão .jpg, ~700 KB cada) seguem
 * em streaming, sem ficar na memória da função.
 */

const UPSTREAM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Origin: "https://animefire.one",
  Referer: "https://animefire.one/",
};

const REQUEST_TIMEOUT = 20_000;

/** Cabeçalhos do CDN que o player precisa para pedir pedaços do segmento. */
const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
];

/**
 * Um segmento nunca muda depois de publicado; guardado na CDN, o segundo
 * visitante do mesmo episódio não custa uma ida ao AnimeFire.
 */
const SEGMENT_CACHE = "public, max-age=86400, s-maxage=86400, immutable";

const isPlaylist = (contentType: string | null, url: URL) =>
  /mpegurl/i.test(contentType ?? "") || url.pathname.endsWith(".m3u8");

/**
 * Toda referência da playlist — linhas de URI e atributos `URI="..."` de tags
 * como EXT-X-MAP e EXT-X-MEDIA — vira um endereço deste handler.
 */
const rewritePlaylist = (playlist: string, source: URL) =>
  playlist
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(
          /URI="([^"]+)"/g,
          (_, uri: string) => `URI="${relayUrl(new URL(uri, source))}"`
        );
      }
      return relayUrl(new URL(trimmed, source));
    })
    .join("\n");

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const source = parseRelaySource(new URL(request.url).searchParams.get("src"));
  if (!source) return new Response(null, { status: 400 });

  const range = request.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(source, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers: range ? { ...UPSTREAM_HEADERS, Range: range } : UPSTREAM_HEADERS,
    });
  } catch {
    return new Response(null, { status: 504 });
  }

  if (!upstream.ok) return new Response(null, { status: upstream.status });

  const contentType = upstream.headers.get("content-type");

  if (isPlaylist(contentType, source)) {
    return new Response(rewritePlaylist(await upstream.text(), source), {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        // A playlist carrega o token do CDN, que vence em algumas horas.
        "Cache-Control": "no-store",
      },
    });
  }

  const headers = new Headers({ "Cache-Control": SEGMENT_CACHE });
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
