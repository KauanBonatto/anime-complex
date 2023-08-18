"use client";

import AnimeGrid from "@/components/AnimeGrid";
import GenderFilter from "@/components/GenderFilter";
import Navbar from "@/components/Navbar";
import AnimeService from "@/services/AnimeSevice";
import { Box, Card, LinearProgress } from "@mui/material";
import { useCallback, useState } from "react";

const HomeView = () => {
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<string[]>([]);

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

  const filterAnimesList = useCallback(async () => {
    const animePopularCleanedList = popularAnimeList?.results.filter(
      (anime: AnimeProps) => {
        return filters.every((genre) => anime.genres?.includes(genre));
      }
    ) as AnimeProps[];
    setPopularAnimeList({
      ...popularAnimeList,
      results: animePopularCleanedList,
    } as ResponseApiProps);
  }, [filters, popularAnimeList]);

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
          p: 5,
        }}
      >
        <GenderFilter
          filters={filters}
          setFilters={setFilters}
          filterAnimesList={filterAnimesList}
        />
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
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
        </Box>
      </Card>
    </Box>
  );
};

export default HomeView;
