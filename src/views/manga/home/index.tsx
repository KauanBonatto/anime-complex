"use client";

import AnimeGrid from "@/components/AnimeGrid";
import FilterBar from "@/components/FilterBar";
import PageShell from "@/components/PageShell";
import MangaService from "@/services/MangaService";
import { Box, Typography } from "@mui/material";
import { useCallback, useState } from "react";

const MangaHomeView = () => {
  const [filters, setFilters] = useState<string[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [topRatedLoading, setTopRatedLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [popularMangaList, setPopularMangaList] =
    useState<ResponseApiProps | null>(null);
  const [topRatedMangaList, setTopRatedMangaList] =
    useState<ResponseApiProps | null>(null);
  const [recentMangaList, setRecentMangaList] =
    useState<ResponseApiProps | null>(null);

  const getMangaPopularData = useCallback(
    async (pageNumber: number) => {
      setPopularLoading(true);
      const popularMangaListData = await MangaService.getPopularManga(
        pageNumber,
        filters
      );
      setPopularMangaList(popularMangaListData);
      setPopularLoading(false);
    },
    [filters]
  );

  const getMangaTopRatedData = useCallback(
    async (pageNumber: number) => {
      setTopRatedLoading(true);
      const topRatedMangaListData = await MangaService.getTopRatedManga(
        pageNumber,
        filters
      );
      setTopRatedMangaList(topRatedMangaListData);
      setTopRatedLoading(false);
    },
    [filters]
  );

  const getMangaRecentData = useCallback(
    async (pageNumber: number) => {
      setRecentLoading(true);
      const recentMangaListData = await MangaService.getRecentManga(
        pageNumber,
        filters
      );
      setRecentMangaList(recentMangaListData);
      setRecentLoading(false);
    },
    [filters]
  );

  const filtersToken = filters.join(",");

  return (
    <PageShell loading={popularLoading || topRatedLoading || recentLoading}>
      <FilterBar filters={filters} setFilters={setFilters} />
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: { xs: 8, md: 12 } }}
      >
          <AnimeGrid
            media="manga"
            title="Mangás Populares"
            loading={popularLoading}
            animeData={popularMangaList as ResponseApiProps}
            getAnimeData={getMangaPopularData}
            resetToken={filtersToken}
            emptyMessage="Nenhum mangá encontrado com os parâmetros informados!"
          />
          <AnimeGrid
            media="manga"
            title="Melhores Avaliados"
            loading={topRatedLoading}
            animeData={topRatedMangaList as ResponseApiProps}
            getAnimeData={getMangaTopRatedData}
            resetToken={filtersToken}
            emptyMessage="Nenhum mangá encontrado com os parâmetros informados!"
          />
          <AnimeGrid
            media="manga"
            title="Lançamentos Recentes"
            loading={recentLoading}
            animeData={recentMangaList as ResponseApiProps}
            getAnimeData={getMangaRecentData}
            resetToken={filtersToken}
            emptyMessage="Nenhum lançamento recente com os parâmetros informados!"
          />
      </Box>
      <Typography variant="caption" color="text.disabled" display="block" mt={6}>
        Catálogo e avaliações fornecidos pelo AniList.
      </Typography>
    </PageShell>
  );
};

export default MangaHomeView;
