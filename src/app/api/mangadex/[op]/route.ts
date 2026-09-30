import {
  MANGADEX_REVALIDATE,
  getChapterFeed,
  getChapterPages,
  getPtBrDescription,
  isMangaDexId,
} from "@/services/MangaDexService/server";
import { NextResponse } from "next/server";

/**
 * Ponte entre o browser e a API do MangaDex, que não libera CORS para outros
 * domínios. Como no /api/anilist, a mesma resposta atende todo mundo pela CDN,
 * e só as operações abaixo passam: a rota não é um proxy aberto.
 *
 * As imagens das páginas não passam por aqui. Os servidores do MangaDex@Home
 * aceitam o site como origem, então o leitor as carrega direto de lá.
 */

type Loader = (params: URLSearchParams) => Promise<unknown>;

/** O ID do AniList e os títulos que o MangaDex usa para achar a obra. */
const mangaRef = (params: URLSearchParams) => ({
  id: params.get("id") ?? "",
  titles: [params.get("title"), params.get("titleEnglish")].filter(
    (title): title is string => !!title
  ),
});

const OPERATIONS: Record<string, { load: Loader; ttl: number }> = {
  description: {
    load: (p) => {
      const { id, titles } = mangaRef(p);
      return getPtBrDescription(id, titles);
    },
    ttl: MANGADEX_REVALIDATE.search,
  },
  chapters: {
    load: (p) => {
      const { id, titles } = mangaRef(p);
      return getChapterFeed(id, titles);
    },
    ttl: MANGADEX_REVALIDATE.feed,
  },
  pages: {
    load: (p) =>
      getChapterPages(p.get("chapter") ?? "", { fresh: p.has("fresh") }),
    ttl: MANGADEX_REVALIDATE.pages,
  },
};

/** Um dia de sobra para a CDN servir a versão anterior enquanto renova. */
const STALE_SECONDS = 24 * 60 * 60;

const invalidParams = (op: string, params: URLSearchParams) => {
  if (op === "pages") return !isMangaDexId(params.get("chapter") ?? "");
  const { id, titles } = mangaRef(params);
  return !/^\d+$/.test(id) || !titles.length;
};

export async function GET(
  request: Request,
  { params }: { params: { op: string } }
) {
  const operation = OPERATIONS[params.op];
  if (!operation) {
    return NextResponse.json({ error: "Operação desconhecida" }, { status: 404 });
  }

  const search = new URL(request.url).searchParams;
  if (invalidParams(params.op, search)) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  try {
    // Nulo aqui é resposta de verdade ("o MangaDex não tem"), e vale cache.
    const data = await operation.load(search);
    if (search.has("fresh")) {
      return NextResponse.json(data ?? null, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(data ?? null, {
      headers: {
        "Cache-Control": `public, max-age=0, s-maxage=${operation.ttl}, stale-while-revalidate=${
          // As páginas vencem junto com o servidor do MangaDex@Home: servir
          // uma versão antiga entregaria endereços que já não abrem.
          params.op === "pages" ? 0 : STALE_SECONDS
        }`,
      },
    });
  } catch (err) {
    // Falha de rede ou rate limit: não pode ir para a CDN.
    return NextResponse.json(null, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
