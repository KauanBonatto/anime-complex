"use client";

import AnimeGrid from "@/components/AnimeGrid";
import Footer from "@/components/Footer";
import GenderFilter from "@/components/GenderFilter";
import Navbar from "@/components/Navbar";
import MangaService from "@/services/MangaService";
import { Box, Card, LinearProgress, Typography } from "@mui/material";
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
    <Box width="100%">
      {(popularLoading || topRatedLoading || recentLoading) && (
        <LinearProgress
          sx={{ width: "100%", position: "fixed" }}
          color="primary"
        />
      )}
      <Navbar />
      <Card
        sx={{
          minHeight: "calc(100vh - 108px)",
          borderRadius: 0,
          p: 5,
        }}
      >
        <GenderFilter filters={filters} setFilters={setFilters} />
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
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
        <Typography
          variant="caption"
          color="text.disabled"
          display="block"
          mt={6}
        >
          Catálogo e avaliações fornecidos pelo AniList.
        </Typography>
      </Card>
      <Footer />
    </Box>
  );
};

export default MangaHomeView;
