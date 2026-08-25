"use client";

import AnimeGrid from "@/components/AnimeGrid";
import Footer from "@/components/Footer";
import GenderFilter from "@/components/GenderFilter";
import Navbar from "@/components/Navbar";
import AnilistService from "@/services/AnilistService";
import { Box, Card, LinearProgress, Typography } from "@mui/material";
import { useCallback, useState } from "react";

const HomeView = () => {
  const [filters, setFilters] = useState<string[]>([]);
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

  return (
    <Box width="100%">
      {(popularLoading || recentLoading) && (
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

export default HomeView;
