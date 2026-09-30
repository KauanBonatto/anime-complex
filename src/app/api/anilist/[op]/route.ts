import AnilistService, { ANILIST_TTL } from "@/services/AnilistService";
import MangaService from "@/services/MangaService";
import { NextResponse } from "next/server";

/**
 * Ponte entre o browser e o AniList. O rate limit dele é por IP, e com o
 * browser falando direto cada visitante refazia do zero as consultas que o
 * anterior acabou de fazer — a home sozinha gastava nove das trinta
 * requisições por minuto, e o prefetch dos cards consumia o resto.
 *
 * Aqui os serviços rodam no servidor, e a mesma resposta atende todo mundo em
 * três camadas: a memória da função (`createCache`), o Data Cache do Next
 * (compartilhado entre instâncias) e a CDN da Vercel, pelo Cache-Control
 * abaixo. O `stale-while-revalidate` longo faz a CDN seguir servindo a versão
 * anterior enquanto busca a nova — e também quando o AniList está bloqueando.
 */

type Loader = (params: URLSearchParams) => Promise<unknown>;

const page = (params: URLSearchParams) => Number(params.get("page")) || 1;

const genres = (params: URLSearchParams) =>
  (params.get("genres") ?? "").split(",").filter(Boolean);

const id = (params: URLSearchParams) => params.get("id") ?? "";

const query = (params: URLSearchParams) => params.get("q") ?? "";

/** Só estas consultas passam: a rota não é um proxy aberto para o AniList. */
const OPERATIONS: Record<string, { load: Loader; ttl: number }> = {
  "anime-popular": {
    load: (p) => AnilistService.getPopularAnime(page(p), genres(p)),
    ttl: ANILIST_TTL.list,
  },
  "anime-recent": {
    load: (p) => AnilistService.getRecentAnime(page(p), genres(p)),
    ttl: ANILIST_TTL.list,
  },
  "anime-airing": {
    load: () => AnilistService.getRecentEpisodesWindow(),
    ttl: ANILIST_TTL.airing,
  },
  "anime-upcoming": {
    load: () => AnilistService.getUpcomingWindow(),
    ttl: ANILIST_TTL.airing,
  },
  "anime-search": {
    load: (p) => AnilistService.getAnimeBySearch(query(p), page(p), genres(p)),
    ttl: ANILIST_TTL.list,
  },
  "anime-details": {
    load: (p) => AnilistService.getAnimeDetails(id(p)),
    ttl: ANILIST_TTL.details,
  },
  "anime-franchise": {
    load: (p) => AnilistService.getFranchiseSeasons(id(p)),
    ttl: ANILIST_TTL.franchise,
  },
  "manga-popular": {
    load: (p) => MangaService.getPopularManga(page(p), genres(p)),
    ttl: ANILIST_TTL.list,
  },
  "manga-top": {
    load: (p) => MangaService.getTopRatedManga(page(p), genres(p)),
    ttl: ANILIST_TTL.list,
  },
  "manga-recent": {
    load: (p) => MangaService.getRecentManga(page(p), genres(p)),
    ttl: ANILIST_TTL.list,
  },
  "manga-search": {
    load: (p) => MangaService.getMangaBySearch(query(p), page(p), genres(p)),
    ttl: ANILIST_TTL.list,
  },
  "manga-details": {
    load: (p) => MangaService.getMangaDetails(id(p)),
    ttl: ANILIST_TTL.details,
  },
};

/** Um dia de sobra para a CDN servir a versão anterior enquanto renova. */
const STALE_SECONDS = 24 * 60 * 60;

/**
 * Uma lista sem resultados quase sempre é rate limit ou falha de rede, e não
 * pode ir para a CDN — congelaria a tela vazia para todos os visitantes.
 *
 * Vale também para a franquia, embora vazia seja a resposta certa de uma obra
 * avulsa: refazê-la custa uma consulta que o Data Cache já guardou.
 */
const isEmpty = (data: unknown) => {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  const results = (data as ResponseApiProps).results;
  return Array.isArray(results) && results.length === 0;
};

export async function GET(
  request: Request,
  { params }: { params: { op: string } }
) {
  const operation = OPERATIONS[params.op];
  if (!operation) {
    return NextResponse.json({ error: "Operação desconhecida" }, { status: 404 });
  }

  const data = await operation.load(new URL(request.url).searchParams);

  if (isEmpty(data)) {
    return NextResponse.json(data ?? null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const maxAge = Math.floor(operation.ttl / 1000);
  return NextResponse.json(data, {
    headers: {
      // O browser já guarda tudo no próprio cache (localStorage), então aqui o
      // que importa é a CDN, compartilhada entre visitantes.
      "Cache-Control": `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${STALE_SECONDS}`,
    },
  });
}
