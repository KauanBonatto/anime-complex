"use client";

import CrunchyrollChip from "@/components/CrunchyrollChip";
import EpisodeListAside from "@/components/EpisodeListAside";
import EpisodePlayer from "@/components/EpisodePlayer";
import PageShell from "@/components/PageShell";
import { useFranchiseSeasons } from "@/hooks/useFranchiseSeasons";
import AnilistService from "@/services/AnilistService";
import SugoiService from "@/services/SugoiService";
import TmdbService from "@/services/TmdbService";
import { crunchyrollEpisodeLink, episodeDateLabel } from "@/utils/anime";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {
  Box,
  Button,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Prioriza quem toca aqui dentro, depois os players sem anúncios e, entre eles,
 * os embeds e as playlists HLS: os links diretos de vídeo vêm com token do CDN
 * e costumam responder 401 fora do site de origem.
 */
const isHosted = (provider: EpisodeProviderProps) =>
  provider.isEmbed || !!provider.isHls;

const sortProviders = (providers: EpisodeProviderProps[]) =>
  [...providers].sort(
    (a, b) =>
      Number(!!a.isExternal) - Number(!!b.isExternal) ||
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
  const [localized, setLocalized] = useState(false);
  const [providers, setProviders] = useState<EpisodeProviderProps[]>([]);
  const [selectedProvider, setSelectedProvider] =
    useState<EpisodeProviderProps | null>(null);

  const seasons = useFranchiseSeasons(animeId);

  const getEpisodeData = useCallback(async () => {
    setLoading(true);
    setLocalized(false);
    setProviders([]);
    setSelectedProvider(null);

    const animeDetailsData = await AnilistService.getAnimeDetails(animeId);
    if (!animeDetailsData || !episodeNumber) {
      setInvalidEpisode(true);
      setLoading(false);
      return;
    }
    setAnimeDetails(animeDetailsData);
    // Os dados de episódio vêm em inglês do AniList; o TMDB tem a versão em
    // pt-BR, com imagem e sinopse. Os players não esperam por essa tradução —
    // são buscados logo abaixo — e ela só é aplicada se a página ainda estiver
    // no mesmo anime, para uma resposta atrasada não sobrescrever outra ficha.
    TmdbService.localize(animeDetailsData).then((traduzido) => {
      setAnimeDetails((current) =>
        current?.id === traduzido.id ? traduzido : current,
      );
      setLocalized(true);
    });

    const episodeProviders = sortProviders(
      await SugoiService.getEpisodeProviders(animeDetailsData, episodeNumber),
    );
    setProviders(episodeProviders);
    // Os que só abrem em aba nova ficam de fora: eles não têm o que tocar aqui.
    setSelectedProvider(
      episodeProviders.find((provider) => !provider.isExternal) ?? null,
    );
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

  const episode = animeDetails?.episodes?.[episodeNumber];

  return (
    <PageShell loading={loading}>
      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          <Box mb={3}>
            <Typography variant="h4" fontWeight={500}>
              {animeDetails?.title ?? <Skeleton sx={{ maxWidth: 380 }} />}
            </Typography>
            <Typography variant="h6" fontWeight={400} color="text.disabled">
              Episódio {episodeNumber}
              {episode?.title && ` - ${episode.title}`}
            </Typography>
            {!!episode?.airedAt && (
              <Typography variant="caption" color="text.disabled">
                Exibido em {episodeDateLabel(episode.airedAt)}
              </Typography>
            )}
          </Box>

          <Box mb={4}>
            {loading && (
              <Skeleton
                variant="rounded"
                sx={{ width: "100%", height: "auto", aspectRatio: "16 / 9" }}
              />
            )}

            {!loading && !!providers.length && (
              <EpisodePlayer
                providers={providers}
                selectedProvider={selectedProvider}
                onSelectProvider={setSelectedProvider}
                crunchyroll={crunchyrollLink}
              />
            )}

            {!loading && !providers.length && (
              <Stack alignItems="center" gap={2} py={4}>
                <Typography>
                  Nenhum player encontrado para este episódio.
                </Typography>
                {crunchyrollLink && <CrunchyrollChip link={crunchyrollLink} />}
              </Stack>
            )}
          </Box>

          <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
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
          </Box>

          {!!episode?.overview && (
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-line", maxWidth: 900 }}
            >
              {episode.overview}
            </Typography>
          )}
        </Grid>

        <Grid item xs={12} lg={4}>
          {animeDetails ? (
            <EpisodeListAside
              anime={animeDetails}
              seasons={seasons}
              currentEpisode={episodeNumber}
              localized={localized}
            />
          ) : (
            <Skeleton variant="rounded" sx={{ width: "100%", height: 420 }} />
          )}
        </Grid>
      </Grid>
    </PageShell>
  );
};

export default AnimeEpisodeView;
