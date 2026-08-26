"use client";

import AnimeEpisodesGrid from "@/components/AnimeEpisodesGrid";
import CrunchyrollChip from "@/components/CrunchyrollChip";
import EpisodePlayer from "@/components/EpisodePlayer";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import AnilistService from "@/services/AnilistService";
import SugoiService from "@/services/SugoiService";
import { crunchyrollEpisodeLink } from "@/utils/anime";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {
  Box,
  Button,
  Card,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Prioriza players sem anúncios e, entre eles, os embeds e as playlists HLS: os
 * links diretos de vídeo vêm com token do CDN e costumam responder 401 fora do
 * site de origem.
 */
const isHosted = (provider: EpisodeProviderProps) =>
  provider.isEmbed || !!provider.isHls;

const sortProviders = (providers: EpisodeProviderProps[]) =>
  [...providers].sort(
    (a, b) =>
      Number(a.hasAds) - Number(b.hasAds) ||
      Number(isHosted(b)) - Number(isHosted(a)),
  );

const AnimeEpisodeView = ({
  params,
}: {
  params: { anime_id: string; episode_id: string };
}) => {
  const router = useRouter();
  const animeId = params.anime_id;
  const episodeNumber = Number(params.episode_id);

  const [loading, setLoading] = useState(true);
  const [invalidEpisode, setInvalidEpisode] = useState(false);
  const [animeDetails, setAnimeDetails] = useState<AnimeDetailsProps | null>(
    null,
  );
  const [providers, setProviders] = useState<EpisodeProviderProps[]>([]);
  const [selectedProvider, setSelectedProvider] =
    useState<EpisodeProviderProps | null>(null);

  const getEpisodeData = useCallback(async () => {
    setLoading(true);
    setProviders([]);
    setSelectedProvider(null);

    const animeDetailsData = await AnilistService.getAnimeDetails(animeId);
    if (!animeDetailsData || !episodeNumber) {
      setInvalidEpisode(true);
      setLoading(false);
      return;
    }
    setAnimeDetails(animeDetailsData);

    const episodeProviders = sortProviders(
      await SugoiService.getEpisodeProviders(animeDetailsData, episodeNumber),
    );
    setProviders(episodeProviders);
    setSelectedProvider(episodeProviders[0] ?? null);
    setLoading(false);
  }, [animeId, episodeNumber]);

  useEffect(() => {
    getEpisodeData();
  }, [getEpisodeData]);

  if (invalidEpisode) notFound();

  const goToEpisode = (nextEpisode: number) =>
    router.push(`/anime/${animeId}/${nextEpisode}`);

  const hasNextEpisode =
    !!animeDetails && episodeNumber < animeDetails.availableEpisodes;

  const crunchyrollLink = crunchyrollEpisodeLink(
    animeDetails?.crunchyroll,
    episodeNumber,
  );

  const episodeTitle = animeDetails?.episodeTitles?.[episodeNumber];

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
          <Grid item xs={12} mt={1} mb={4}>
            <Typography variant="h4" fontWeight={500}>
              {animeDetails?.title ?? <Skeleton sx={{ maxWidth: 380 }} />}
            </Typography>
            <Typography variant="h6" fontWeight={400} color="text.disabled">
              Episódio {episodeNumber}
              {episodeTitle && ` - ${episodeTitle}`}
            </Typography>
          </Grid>

          <Grid item xs={12} mb={4}>
            {loading && (
              <Skeleton
                variant="rounded"
                sx={{
                  maxWidth: "100%",
                  width: 900,
                  height: 506,
                  margin: "auto",
                }}
              />
            )}

            {!loading && selectedProvider && (
              <EpisodePlayer
                providers={providers}
                selectedProvider={selectedProvider}
                onSelectProvider={setSelectedProvider}
                crunchyroll={crunchyrollLink}
              />
            )}

            {!loading && !selectedProvider && (
              <Stack alignItems="center" gap={2}>
                <Typography>
                  Nenhum player encontrado para este episódio.
                </Typography>
                {crunchyrollLink && <CrunchyrollChip link={crunchyrollLink} />}
              </Stack>
            )}
          </Grid>

          <Grid item xs={12} display="flex" gap={2} mb={5}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIosNewIcon />}
              disabled={episodeNumber <= 1}
              onClick={() => goToEpisode(episodeNumber - 1)}
            >
              Episódio anterior
            </Button>
            <Button
              variant="outlined"
              endIcon={<ArrowForwardIosIcon />}
              disabled={!hasNextEpisode}
              onClick={() => goToEpisode(episodeNumber + 1)}
            >
              Próximo episódio
            </Button>
          </Grid>

          {animeDetails && (
            <Grid item xs={12} mb={5}>
              <AnimeEpisodesGrid
                anime={animeDetails}
                currentEpisode={episodeNumber}
              />
            </Grid>
          )}
        </Grid>
      </Card>
      <Footer />
    </Box>
  );
};

export default AnimeEpisodeView;
