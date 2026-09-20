import { NextResponse } from "next/server";
import {
  anistreamConfig,
  authorizedFetch,
  decodeStreamSrc,
  encodeStreamSrc,
} from "@/utils/anistream";

/**
 * Único endpoint do AniStream que o browser toca. Recebe um `src` codificado
 * (caminho relativo do Jellyfin, sem host e sem token), reconstrói a URL contra
 * a base fixa e injeta o token pelo header — que nunca passa pelo cliente e é
 * renovado sozinho quando o Jellyfin responde 401.
 *
 * Playlists (.m3u8) voltam reescritas: cada referência filha — sub-playlist,
 * legenda, segmento — é reapontada para este mesmo proxy, ainda sem token. Os
 * segmentos de vídeo passam por streaming, sem ficar na memória.
 */

const REQUEST_TIMEOUT = 30_000;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = anistreamConfig();
  if (!config) return new NextResponse(null, { status: 404 });

  const src = new URL(request.url).searchParams.get("src");
  const path = src ? decodeStreamSrc(src) : null;
  if (!path) return new NextResponse(null, { status: 400 });

  const upstream = new URL(config.jellyfinBase + path);

  try {
    const response = await authorizedFetch(config, upstream, REQUEST_TIMEOUT);

    if (!response || !response.ok || !response.body) {
      return new NextResponse(null, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isPlaylist =
      contentType.includes("mpegurl") || upstream.pathname.endsWith(".m3u8");

    // A playlist é pequena e precisa ser reescrita antes de seguir ao player.
    if (isPlaylist) {
      const body = rewritePlaylist(await response.text(), upstream);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
        },
      });
    }

    // Segmentos e demais binários vão por streaming, do Jellyfin ao player.
    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const key of ["content-type", "content-length"]) {
      const value = response.headers.get(key);
      if (value) headers.set(key, value);
    }
    return new NextResponse(response.body, { headers });
  } catch (err) {
    return new NextResponse(null, { status: 504 });
  }
}

/**
 * Reescreve uma playlist HLS para que tudo que ela cite passe de volta por este
 * proxy. Endereços relativos são resolvidos contra a URL de origem; o resultado
 * perde host e token e vira outro `src` codificado.
 */
const rewritePlaylist = (playlist: string, source: URL): string =>
  playlist
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Tags com URI embutida (EXT-X-MEDIA, EXT-X-KEY, EXT-X-MAP…).
      if (trimmed.startsWith("#")) {
        return line.replace(
          /URI="([^"]+)"/g,
          (_match, uri) => `URI="${proxied(uri, source)}"`
        );
      }

      // Linha de URI: segmento ou sub-playlist.
      return proxied(trimmed, source);
    })
    .join("\n");

/**
 * Converte uma referência da playlist no endereço deste proxy. Sai da base do
 * AniStream só o que for da própria base; qualquer host estranho fica como
 * está, para o proxy não virar um repassador aberto.
 */
const proxied = (uri: string, source: URL): string => {
  let target: URL;
  try {
    target = new URL(uri, source);
  } catch {
    return uri;
  }

  if (target.host !== source.host) return uri;
  return `/api/anistream/stream?src=${encodeStreamSrc(
    target.pathname + target.search
  )}`;
};
