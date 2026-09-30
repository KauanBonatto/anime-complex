/**
 * Plano B do download de capítulos. Para montar o PDF ou o CBZ o browser
 * precisa ler os bytes de cada página, e isso depende de o servidor do
 * MangaDex@Home liberar CORS. Os servidores oficiais liberam, mas a rede é
 * feita de nós voluntários; quando um deles não libera, a página vem por aqui.
 *
 * A leitura nunca passa por este handler: `<img>` não depende de CORS.
 */

/** Só servidores do MangaDex@Home, para o handler não virar proxy aberto. */
const IMAGE_HOSTS = [/^[a-z0-9-]+(\.[a-z0-9-]+)*\.mangadex\.network$/i, /^uploads\.mangadex\.org$/i];

/** Alguns nós põem um token antes do `/data`. */
const IMAGE_PATH = /^(\/[^/]+)?\/(data|data-saver)\/[0-9a-f]+\/[^/]+$/i;

const REQUEST_TIMEOUT = 20_000;

const parseImageUrl = (value: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (!IMAGE_HOSTS.some((host) => host.test(url.hostname))) return null;
    return IMAGE_PATH.test(url.pathname) ? url : null;
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  const url = parseImageUrl(new URL(request.url).searchParams.get("url"));
  if (!url) return new Response("URL inválida", { status: 400 });

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !res.body || !type.startsWith("image/")) {
      return new Response(null, { status: 502 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": type,
        // O endereço inclui o hash do arquivo: o conteúdo nunca muda.
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
