"use client";

import AnimeEpisodesGrid from "@/components/AnimeEpisodesGrid";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import AnimeService from "@/services/AnimeSevice";
import { Box, Card, Grid, LinearProgress } from "@mui/material";
import { useCallback, useEffect, useState } from "react";

const AnimeInfoView = ({ params }: { params: { anime_id: string } }) => {
  const animeId = params.anime_id;
  const [loading, setLoading] = useState(false);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfoProps | null>(null);

  const getAnimeInfoData = useCallback(async () => {
    setLoading(true);
    const animeInfoData = await AnimeService.getAnimeInfo(animeId);
    if (!animeInfoData) {
      window.location.assign("/anime_not_found");
    }
    setAnimeInfo(animeInfoData as AnimeInfoProps);

    setTimeout(() => setLoading(false), 300);
  }, [animeId]);

  useEffect(() => {
    getAnimeInfoData();
  }, [getAnimeInfoData]);

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
        {animeInfo && (
          <Grid container>
            <Grid
              item
              display="flex"
              flexWrap="wrap"
              width="100%"
              gap={1}
              mt={1}
              mb={5}
            >
              <AnimeEpisodesGrid loading={loading} animeInfo={animeInfo} />
            </Grid>
          </Grid>
        )}
      </Card>
      <Footer />
    </Box>
  );
};

export default AnimeInfoView;
