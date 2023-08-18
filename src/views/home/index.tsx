"use client";

import AnimeGrid from "@/components/AnimeGrid";
import Navbar from "@/components/Navbar";
import AnimeService from "@/services/AnimeSevice";
import { Box, Card, LinearProgress } from "@mui/material";
import { useCallback, useState } from "react";

const HomeView = () => {
  const [loading, setLoading] = useState(false);

  const [popularAnimeList, setPopularAnimeList] =
    useState<ResponseApiProps | null>(null);

  const [recentAnimeList, setRecentAnimeList] =
    useState<ResponseApiProps | null>(null);

  const getAnimePopularData = useCallback(async (pageNumber: number) => {
    setLoading(true);
    const popularAnimeListData = await AnimeService.getTopAiringAnime(
      pageNumber
    );
    setPopularAnimeList(cleanAnimeList(popularAnimeListData));
    setLoading(false);
  }, []);

  const getAnimeRecentData = useCallback(async (pageNumber: number) => {
    setLoading(true);
    const recentAnimeListData = await AnimeService.getRecentEpisodesAnime(
      pageNumber
    );
    setRecentAnimeList(cleanAnimeList(recentAnimeListData));
    setLoading(false);
  }, []);

  const cleanAnimeList = (response: ResponseApiProps) => {
    const animeIdList = response.results.map((anime) => anime.id);
    const animeCleanedList = response.results.filter(
      (anime: AnimeProps, index: number) =>
        animeIdList.indexOf(anime.id) == index
    );
    return { ...response, results: animeCleanedList };
  };

  return (
    <Box width="100%">
      {loading && (
        <LinearProgress
          sx={{ width: "100%", position: "fixed" }}
          color="primary"
        />
      )}
      <Navbar />
      <Card
        sx={{
          borderRadius: 0,
          display: "flex",
          flexWrap: "wrap",
          p: 5,
          gap: 12,
        }}
      >
        <AnimeGrid
          title="Animes Populares"
          animeData={popularAnimeList as ResponseApiProps}
          getAnimeData={getAnimePopularData}
        />
        <AnimeGrid
          title="Adicionados Recentemente"
          animeData={recentAnimeList as ResponseApiProps}
          getAnimeData={getAnimeRecentData}
        />
      </Card>
    </Box>
  );
};

export default HomeView;
