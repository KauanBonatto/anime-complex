import { NextResponse } from "next/server";

/**
 * O Top Animes não entrega um player, e sim uma página que embrulha o vídeo —
 * e nenhuma das versões dela roda no nosso iframe. A antiga checa o
 * `document.referrer` e troca o próprio endereço pela home quando não
 * reconhece o domínio; a nova busca as fontes com `mode=api2`, de uma origem
 * que não libera CORS para nós.
 *
 * Este handler abre a página no servidor, onde nem Referer nem CORS atrapalham,
 * e entrega ao player só o endereço da playlist. Os segmentos nunca passam por
 * aqui: eles pedem no máximo um User-Agent de browser, que o browser tem de
 * sobra, então vão direto do CDN para o player.
 */

const PLAYER_REFERER = "https://topanimes.net/";

/** Sem um UA de browser tanto a página quanto os CDNs respondem com bloqueio. */
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * Só estas páginas de player podem ser pedidas de fora, para o handler não
 * virar proxy aberto. O endereço da playlist não entra em lista nenhuma porque
 * quem o escolhe é a página, não o cliente — e o host do CDN muda a cada
 * request.
 */
const PLAYER_HOSTS = [/^topanimes\.net$/, /^sk-api\.alibabacdn\.net$/];

/** Endereços internos, que nenhuma resposta de player tem motivo para citar. */
const PRIVATE_HOST =
  /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[|.*\.(local|internal)$)/i;

const REQUEST_TIMEOUT = 20_000;

/** Extrai a URL do HLS do `jwplayer(...).setup({ sources: [{ file: ... }] })`. */
const M3U8_IN_PAGE = /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/;

const parseUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !PRIVATE_HOST.test(url.hostname)
      ? url
      : null;
  } catch {
    return null;
  }
};

const parsePlayerPage = (value: string | null) => {
  const url = parseUrl(value);
  return url && PLAYER_HOSTS.some((host) => host.test(url.hostname))
    ? url
    : null;
};

const fetchAsBrowser = (url: URL) =>
  fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    headers: { "User-Agent": BROWSER_UA, Referer: PLAYER_REFERER },
  });

/**
 * A versão nova não traz a playlist no HTML: a página pede as fontes a si mesma
 * com `mode=api2` e monta o JW Player com o que voltar.
 */
const resolveFromApi = async (page: URL) => {
  const endpoint = new URL(page);
  endpoint.searchParams.set("mode", "api2");

  const response = await fetchAsBrowser(endpoint);
  if (!response.ok) return null;

  const body = await response.json();
  if (body?.status !== "success") return null;

  // `midias` vem da melhor para a pior qualidade.
  const best = (body.midias ?? []).find((media: { url?: string }) => media?.url);
  return parseUrl(best?.url);
};

/** A versão antiga deixa a playlist no `setup()` do JW Player, dentro do HTML. */
const resolveFromPage = async (page: URL) => {
  const response = await fetchAsBrowser(page);
  if (!response.ok) return null;

  const match = M3U8_IN_PAGE.exec(await response.text());
  // O PHP do site escapa as barras quando monta o JSON do player.
  return match ? parseUrl(match[1].replace(/\\\//g, "/")) : null;
};

/**
 * A playlist da versão antiga só abre com o Referer do Top Animes, então ela
 * precisa passar por nós. A da versão nova abre para qualquer um e ainda libera
 * CORS — e é bom que o browser a busque sozinho, porque o CDN amarra o token
 * dos segmentos a quem pediu a playlist: buscada aqui, ela renderia segmentos
 * que só o nosso servidor conseguiria baixar.
 */
const needsProxy = (page: URL) => page.pathname.includes("/antivirus");

/**
 * Servida da nossa origem, a playlist perde a referência de onde veio, então os
 * endereços relativos dos segmentos precisam virar absolutos.
 */
const toAbsoluteUris = (playlist: string, source: URL) =>
  playlist
    .split("\n")
    .map((line) => {
      const uri = line.trim();
      if (!uri || uri.startsWith("#")) return line;
      return new URL(uri, source).toString();
    })
    .join("\n");

const emptyPlaylist = (status: number) =>
  new NextResponse("#EXTM3U\n#EXT-X-ENDLIST\n", {
    status,
    headers: { "Content-Type": "application/vnd.apple.mpegurl" },
  });

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const page = parsePlayerPage(new URL(request.url).searchParams.get("src"));
  if (!page) return emptyPlaylist(400);

  const proxied = needsProxy(page);

  try {
    const source = proxied
      ? await resolveFromPage(page)
      : await resolveFromApi(page);

    // Sem playlist o episódio saiu do ar: o player mostra o aviso e o usuário
    // troca de provider.
    if (!source) return emptyPlaylist(502);

    // O hls.js segue o redirect sozinho e passa a falar direto com o CDN.
    if (!proxied) return NextResponse.redirect(source, 302);

    const response = await fetchAsBrowser(source);
    if (!response.ok) return emptyPlaylist(502);

    return new NextResponse(toAbsoluteUris(await response.text(), source), {
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
