"use client";

import AnimeEpisodesGrid from "@/components/AnimeEpisodesGrid";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import AnimeService from "@/services/AnimeSevice";
import {
  Box,
  Card,
  Grid,
  LinearProgress,
  Skeleton,
  Typography,
} from "@mui/material";
import { Fragment, useCallback, useEffect, useState } from "react";

const AnimeEpisodeView = ({
  params,
}: {
  params: { anime_id: string; episode_id: string };
}) => {
  const animeId = params.anime_id;
  const episodeId = params.episode_id;
  const [loading, setLoading] = useState(false);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfoProps | null>(null);
  const [episodeInfo, setEpisodeInfo] = useState<AnimeEpisodeInfoProps | null>(
    null
  );

  const episodeTitle = () => {
    return episodeId.replaceAll("-", " ").replace(" episode", " - episode");
  };

  const getAnimeInfoData = useCallback(async () => {
    setLoading(true);
    const episodeInfoData = await AnimeService.getAnimeEpisodeByEpisodeId(
      episodeId
    );
    if (!episodeInfoData) {
      window.location.assign("/anime_not_found");
    }
    setEpisodeInfo(episodeInfoData);

    const animeInfoData = await AnimeService.getAnimeInfo(animeId);
    setAnimeInfo(animeInfoData as AnimeInfoProps);
    setTimeout(() => setLoading(false), 600);
  }, [animeId, episodeId]);

  useEffect(() => {
    getAnimeInfoData();
  }, [getAnimeInfoData]);

  const filterAnimeInfo = (animeInfoData: AnimeInfoProps) => {
    const animeEpisode = animeInfoData?.episodes?.find(
      (episode: AnimeEpisodeProps) => {
        return episode.id === episodeId;
      }
    );

    const animeListFiltered = animeInfoData?.episodes?.filter(
      (episode: AnimeEpisodeProps) => {
        const minEpisodeNumber =
          Number(animeEpisode?.number ?? 0) <= 0
            ? 1
            : Number(animeEpisode?.number ?? 0) - 2;
        const maxEpisodeNumber =
          Number(animeEpisode?.number ?? 0) >= animeInfoData?.episodes?.length
            ? animeInfoData?.episodes?.length
            : Number(animeEpisode?.number ?? 0) + 2;

        if (
          episode.number >= minEpisodeNumber &&
          episode.number <= maxEpisodeNumber
        )
          return true;
      }
    );

    console.log(animeListFiltered);

    return { ...animeInfoData, episodes: animeListFiltered };
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
        <Grid container>
          <Grid item sm={12} gap={1} mt={1} mb={5}>
            <Typography
              variant="h4"
              fontWeight={500}
              sx={{
                textTransform: "capitalize",
                userSelect: "none",
                textAlign: "start",
              }}
            >
              {episodeTitle()}
            </Typography>
          </Grid>
          {loading && (
            <Grid item sm={12} textAlign="center">
              <Skeleton
                variant="rounded"
                sx={{
                  maxWidth: "100%",
                  maxHeight: "calc(100vh - 100px)",
                  width: 900,
                  height: 500,
                  margin: "auto",
                }}
              />
            </Grid>
          )}
          {episodeInfo && (
            <Fragment>
              <Grid item sm={12} textAlign="center">
                <iframe
                  onLoad={() => setLoading(false)}
                  allowFullScreen
                  style={{
                    maxWidth: "100%",
                    maxHeight: "calc(100vh - 100px)",
                    width: 900,
                    height: 600,
                    border: "none",
                  }}
                  src={episodeInfo.headers.Referer}
                ></iframe>
              </Grid>
              <Grid item sm={12} mb={6}>
                {animeInfo && (
                  <AnimeEpisodesGrid
                    loading={loading}
                    title="Another episodes"
                    animeInfo={filterAnimeInfo(animeInfo)}
                  />
                )}
              </Grid>
            </Fragment>
          )}
        </Grid>
      </Card>
      <Footer />
    </Box>
  );
};

export default AnimeEpisodeView;
