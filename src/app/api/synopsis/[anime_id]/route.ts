import { getPtBrSynopsis } from "@/services/TmdbService/server";
import { NextResponse } from "next/server";

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
    return NextResponse.json({ description: null, source: null });
  }

  const search = new URL(request.url).searchParams;
  const titles = [search.get("titleEnglish"), search.get("title")].filter(
    (title): title is string => !!title?.trim()
  );
  const year = Number(search.get("year")) || null;

  const synopsis = await getPtBrSynopsis({
    anilistId,
    titles: Array.from(new Set(titles)),
    year,
    format: search.get("format"),
  });

  return NextResponse.json(synopsis);
}
