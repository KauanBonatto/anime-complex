"use client";

import AnimeDetails from "@/components/AnimeDetails";
import AnimeEpisodesGrid from "@/components/AnimeEpisodesGrid";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import AnilistService from "@/services/AnilistService";
import TmdbService from "@/services/TmdbService";
import { Box, Card, Grid, LinearProgress, Skeleton } from "@mui/material";
import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const AnimeInfoView = ({ params }: { params: { anime_id: string } }) => {
  const animeId = params.anime_id;
  const [loading, setLoading] = useState(true);
  const [notFoundAnime, setNotFoundAnime] = useState(false);
  const [animeDetails, setAnimeDetails] = useState<AnimeDetailsProps | null>(
    null
  );

  const getAnimeInfoData = useCallback(async () => {
    setLoading(true);

    const animeDetailsData = await AnilistService.getAnimeDetails(animeId);
    // A sinopse e os nomes de episódio do AniList vêm em inglês; o TMDB tem a
    // versão em pt-BR.
    setAnimeDetails(
      animeDetailsData ? await TmdbService.localize(animeDetailsData) : null
    );
    setNotFoundAnime(!animeDetailsData);
    setLoading(false);
  }, [animeId]);

  useEffect(() => {
    getAnimeInfoData();
  }, [getAnimeInfoData]);

  if (notFoundAnime) notFound();

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
        {loading && (
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Skeleton variant="rounded" height={240} />
            </Grid>
            <Grid item xs={12} sm="auto">
              <Skeleton variant="rounded" width={230} height={325} />
            </Grid>
            <Grid item xs={12} sm>
              <Skeleton variant="text" height={50} sx={{ maxWidth: 420 }} />
              <Skeleton variant="text" sx={{ maxWidth: 260 }} />
              <Skeleton variant="text" sx={{ mt: 3 }} />
              <Skeleton variant="text" />
              <Skeleton variant="text" sx={{ width: "70%" }} />
            </Grid>
          </Grid>
        )}

        {animeDetails && (
          <Grid container>
            <Grid item width="100%" mt={1} mb={5}>
              <AnimeDetails anime={animeDetails} />
            </Grid>
            <Grid item width="100%" mb={5}>
              <AnimeEpisodesGrid anime={animeDetails} />
            </Grid>
          </Grid>
        )}
      </Card>
      <Footer />
    </Box>
  );
};

export default AnimeInfoView;
