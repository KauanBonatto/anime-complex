import { NextResponse } from "next/server";

/**
 * O "player" do Top Animes é uma página que se recusa a rodar fora do domínio
 * deles: quando o `document.referrer` não é do site, ela troca o próprio
 * endereço pela home e o iframe engole o vídeo. O HLS por trás dela continua
 * acessível, mas o CDN exige o Referer do Top Animes na playlist — cabeçalho
 * que o browser não deixa forjar.
 *
 * Este handler resolve a playlist no servidor, onde o Referer é livre, e a
 * devolve pela nossa origem. Os segmentos ficam de fora do intermédio: eles não
 * checam Referer e já vêm com CORS liberado, então o browser busca cada um
 * direto do CDN e nada de pesado passa por aqui.
 */

const PLAYER_REFERER = "https://topanimes.net/";

/** Sem um UA de browser a página do player responde com o HTML de bloqueio. */
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** Só endereços destes domínios entram no fetch, para o handler não virar proxy aberto. */
const ALLOWED_HOSTS = [/^topanimes\.net$/, /(^|\.)b-cdn\.net$/];

const REQUEST_TIMEOUT = 20_000;

/** Extrai a URL do HLS do `jwplayer(...).setup({ sources: [{ file: ... }] })`. */
const M3U8_IN_PAGE = /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/;

const isAllowed = (url: URL) =>
  url.protocol === "https:" &&
  ALLOWED_HOSTS.some((host) => host.test(url.hostname));

const parseAllowed = (value: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return isAllowed(url) ? url : null;
  } catch {
    return null;
  }
};

const fetchAsBrowser = (url: URL) =>
  fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    headers: { "User-Agent": BROWSER_UA, Referer: PLAYER_REFERER },
  });

/** Descobre a playlist escondida na página do player. */
const resolvePlaylist = async (page: URL) => {
  const response = await fetchAsBrowser(page);
  if (!response.ok) return null;

  const match = M3U8_IN_PAGE.exec(await response.text());
  if (!match) return null;

  // O PHP do site escapa as barras quando monta o JSON do player.
  const found = parseAllowed(match[1].replace(/\\\//g, "/"));
  return found;
};

/**
 * Deixa a playlist pronta para tocar da nossa origem: endereços relativos viram
 * absolutos e as playlists aninhadas voltam para cá, já que também dependem do
 * Referer. Os segmentos seguem apontando direto para o CDN.
 */
const rewritePlaylist = (playlist: string, source: URL, base: string) =>
  playlist
    .split("\n")
    .map((line) => {
      const uri = line.trim();
      if (!uri || uri.startsWith("#")) return line;

      const absolute = new URL(uri, source).toString();
      return absolute.includes(".m3u8")
        ? `${base}?playlist=${encodeURIComponent(absolute)}`
        : absolute;
    })
    .join("\n");

const emptyPlaylist = (status: number) =>
  new NextResponse("#EXTM3U\n#EXT-X-ENDLIST\n", {
    status,
    headers: { "Content-Type": "application/vnd.apple.mpegurl" },
  });

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // `src` é a página do player; `playlist` só aparece nas playlists aninhadas.
  const page = parseAllowed(params.get("src"));
  const nested = parseAllowed(params.get("playlist"));
  if (!page && !nested) return emptyPlaylist(400);

  try {
    const source = nested ?? (await resolvePlaylist(page as URL));
    if (!source) return emptyPlaylist(502);

    const response = await fetchAsBrowser(source);
    if (!response.ok) return emptyPlaylist(502);

    const base = new URL(request.url).pathname;
    const playlist = rewritePlaylist(await response.text(), source, base);

    return new NextResponse(playlist, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        // O token do CDN dura poucas horas, então nada de cache longo.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return emptyPlaylist(504);
  }
}
