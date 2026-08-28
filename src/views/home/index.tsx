"use client";

import AnimeGrid from "@/components/AnimeGrid";
import FilterBar from "@/components/FilterBar";
import HomeHero from "@/components/HomeHero";
import PageShell from "@/components/PageShell";
import AnilistService from "@/services/AnilistService";
import { pickHighlights } from "@/utils/anime";
import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";

/** Obras no carrossel de destaque. Poucas, para o revezamento ter fim. */
const HIGHLIGHT_COUNT = 6;

const HomeView = () => {
  const [filters, setFilters] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<AnimeProps[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [popularAnimeList, setPopularAnimeList] =
    useState<ResponseApiProps | null>(null);
  const [recentAnimeList, setRecentAnimeList] =
    useState<ResponseApiProps | null>(null);

  const getAnimePopularData = useCallback(
    async (pageNumber: number) => {
      setPopularLoading(true);
      const popularAnimeListData = await AnilistService.getPopularAnime(
        pageNumber,
        filters
      );
      setPopularAnimeList(popularAnimeListData);
      setPopularLoading(false);
    },
    [filters]
  );

  const getAnimeRecentData = useCallback(
    async (pageNumber: number) => {
      setRecentLoading(true);
      const recentAnimeListData = await AnilistService.getRecentAnime(
        pageNumber,
        filters
      );
      setRecentAnimeList(recentAnimeListData);
      setRecentLoading(false);
    },
    [filters]
  );

  const filtersToken = filters.join(",");

  /**
   * O destaque é sorteado uma vez por conjunto de filtros e guardado, e não
   * derivado das listas a cada render: elas são substituídas quando o usuário
   * pagina, e o carrossel trocaria de obras no meio da navegação.
   */
  useEffect(() => {
    setHighlights([]);
  }, [filtersToken]);

  useEffect(() => {
    if (highlights.length) return;
    // Espera as duas fontes para o sorteio poder misturar as duas.
    if (!popularAnimeList?.results?.length || !recentAnimeList?.results?.length) {
      return;
    }

    setHighlights(
      pickHighlights(
        popularAnimeList.results,
        recentAnimeList.results,
        HIGHLIGHT_COUNT
      )
    );
  }, [popularAnimeList, recentAnimeList, highlights.length]);

  return (
    <PageShell loading={popularLoading || recentLoading}>
      <HomeHero animes={highlights} />

      <FilterBar filters={filters} setFilters={setFilters} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 8, md: 12 } }}>
        <AnimeGrid
          title="Animes Populares"
          loading={popularLoading}
          animeData={popularAnimeList as ResponseApiProps}
          getAnimeData={getAnimePopularData}
          resetToken={filtersToken}
        />
        <AnimeGrid
          title={filters.length ? "Em Exibição" : "Episódios Recentes"}
          loading={recentLoading}
          animeData={recentAnimeList as ResponseApiProps}
          getAnimeData={getAnimeRecentData}
          resetToken={filtersToken}
          // Sem filtro a lista é a grade de exibição, com número de episódio e
          // horário — dados que só o card de lançamento mostra.
          variant={filters.length ? "poster" : "release"}
        />
      </Box>

      <Typography variant="caption" color="text.disabled" display="block" mt={6}>
        Catálogo e avaliações fornecidos pelo AniList.
      </Typography>
    </PageShell>
  );
};

export default HomeView;
