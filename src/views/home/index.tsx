"use client";

import AnimeGrid from "@/components/AnimeGrid";
import Footer from "@/components/Footer";
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
    setTimeout(() => setLoading(false), 300);
  }, []);

  const getAnimeRecentData = useCallback(async (pageNumber: number) => {
    setLoading(true);
    const recentAnimeListData = await AnimeService.getRecentEpisodesAnime(
      pageNumber
    );
    setRecentAnimeList(cleanAnimeList(recentAnimeListData));
    setTimeout(() => setLoading(false), 300);
  }, []);

  const cleanAnimeList = (response: ResponseApiProps) => {
    const animeIdList = response.results.map((anime) => anime.id);
    const animeCleanedList = response.results.filter(
      (anime: AnimeProps, index: number) =>
        animeIdList.indexOf(anime.id) == index
    );
    return { ...response, results: animeCleanedList };
  };

  const filterAnimesList = (animeData: ResponseApiProps, filters: string[]) => {
    if (!filters) return animeData;
    const animeListFiltered = animeData?.results.filter((anime: AnimeProps) => {
      return filters.every((genre) => anime.genres?.includes(genre));
    });
    return { ...animeData, results: animeListFiltered };
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
            loading={loading}
            animeData={filterAnimesList(
              popularAnimeList as ResponseApiProps,
              filters
            )}
            getAnimeData={getAnimePopularData}
          />
          <AnimeGrid
            title="Adicionados Recentemente"
            loading={loading}
            animeData={filterAnimesList(
              recentAnimeList as ResponseApiProps,
              filters
            )}
            getAnimeData={getAnimeRecentData}
          />
        </Box>
      </Card>
      <Footer />
    </Box>
  );
};

export default HomeView;
