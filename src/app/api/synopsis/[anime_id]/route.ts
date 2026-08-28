import {
  getPtBrSynopsis,
  type SynopsisResult,
} from "@/services/TmdbService/server";
import { ONE_DAY, createCache } from "@/utils/cache";
import { NextResponse } from "next/server";

/**
 * O texto da sinopse não muda, então a resposta pode ficar guardada por um dia
 * inteiro — no processo do servidor, para atender todos os visitantes sem
 * repetir a busca no TMDB, e no browser/CDN pelo Cache-Control.
 */
const SYNOPSIS_TTL = ONE_DAY;

const synopsisCache = createCache<SynopsisResult>({
  // O sufixo muda junto com o formato da resposta: respostas guardadas antes de
  // os episódios trazerem imagem seguiriam válidas por um dia, sem ele.
  namespace: "synopsis:v3",
  ttl: SYNOPSIS_TTL,
  maxEntries: 500,
});

const CACHE_HEADERS = {
  "Cache-Control": `public, max-age=${SYNOPSIS_TTL / 1000}, s-maxage=${
    SYNOPSIS_TTL / 1000
  }, stale-while-revalidate=${SYNOPSIS_TTL / 1000}`,
};

/**
 * Sinopse em pt-BR de um anime. A busca acontece aqui porque a chave do TMDB é
 * secreta e a página de detalhes é um componente de client.
 *
 * O título e o ano chegam por query porque quem chama já tem a ficha do
 * AniList em mãos — assim evitamos uma segunda consulta ao AniList só para
 * alimentar o plano B da busca por título.
 */
export async function GET(
  request: Request,
  { params }: { params: { anime_id: string } }
) {
  const anilistId = Number(params.anime_id);
  if (!anilistId) {
    return NextResponse.json({
      description: null,
      title: null,
      episodes: {},
      source: null,
    });
  }

  const search = new URL(request.url).searchParams;
  // O nativo vem primeiro: é por ele que o TMDB indexa a obra, e é o que mais
  // acerta nas séries que ainda não têm título em inglês cadastrado.
  const titles = [
    search.get("titleNative"),
    search.get("titleEnglish"),
    search.get("title"),
  ].filter((title): title is string => !!title?.trim());
  const year = Number(search.get("year")) || null;
  const format = search.get("format");
  const episode = Number(search.get("episode")) || null;
  const premiere = search.get("premiere");
  const uniqueTitles = Array.from(new Set(titles));

  // A resposta muda quando um episódio de outra temporada é anexado, então ela
  // não pode dividir a entrada com a consulta sem alvo.
  const cacheKey = episode ? `${anilistId}:ep${episode}` : String(anilistId);

  const synopsis = await synopsisCache.resolve(
    cacheKey,
    () =>
      getPtBrSynopsis({
        anilistId,
        titles: uniqueTitles,
        year,
        format,
        premiere,
        episode,
      }),
    // Resposta vazia pode ser o TMDB fora do ar; tentamos de novo na próxima.
    {
      shouldStore: (result) =>
        !!result.description || Object.keys(result.episodes).length > 0,
    }
  );

  return NextResponse.json(synopsis, { headers: CACHE_HEADERS });
}
