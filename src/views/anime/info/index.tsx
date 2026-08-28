"use client";

import AnimeDetails from "@/components/AnimeDetails";
import AnimeEpisodesGrid from "@/components/AnimeEpisodesGrid";
import PageShell from "@/components/PageShell";
import SeasonStrip from "@/components/SeasonStrip";
import { useFranchiseSeasons } from "@/hooks/useFranchiseSeasons";
import AnilistService from "@/services/AnilistService";
import TmdbService from "@/services/TmdbService";
import { Box, Grid, Skeleton } from "@mui/material";
import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const AnimeInfoView = ({ params }: { params: { anime_id: string } }) => {
  const animeId = params.anime_id;
  const [loading, setLoading] = useState(true);
  const [notFoundAnime, setNotFoundAnime] = useState(false);
  const [animeDetails, setAnimeDetails] = useState<AnimeDetailsProps | null>(
    null
  );

  const seasons = useFranchiseSeasons(animeId);

  const getAnimeInfoData = useCallback(async () => {
    setLoading(true);

    const animeDetailsData = await AnilistService.getAnimeDetails(animeId);
    // A sinopse e os dados de episódio do AniList vêm em inglês; o TMDB tem a
    // versão em pt-BR, além da imagem e da data de cada episódio.
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
    <PageShell loading={loading}>
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
        <Box display="flex" flexDirection="column" gap={5}>
          <AnimeDetails anime={animeDetails} />
          <SeasonStrip seasons={seasons} />
          <AnimeEpisodesGrid anime={animeDetails} />
        </Box>
      )}
    </PageShell>
  );
};

export default AnimeInfoView;
