"use client";

import { AnimeScoreRating } from "@/components/AnimeScore";
import AnimeTrailer from "@/components/AnimeTrailer";
import MetaItem from "@/components/MetaItem";
import NextEpisode from "@/components/NextEpisode";
import {
  formatLabel,
  genreLabel,
  rankLabel,
  seasonLabel,
  statusLabel,
} from "@/utils/anime";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useState } from "react";

/** Acima disso a sinopse domina a ficha e empurra tudo para fora da tela. */
const DESCRIPTION_CLAMP_LINES = 5;
/** Aproximação de quantos caracteres cabem no clamp, para decidir o botão. */
const DESCRIPTION_CLAMP_CHARS = 420;

const AnimeDetails = ({ anime }: { anime: AnimeDetailsProps }) => {
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const allTimeRankings = anime.rankings.filter((ranking) => ranking.allTime);
  const seasonText = [seasonLabel(anime.season), anime.seasonYear]
    .filter(Boolean)
    .join(" de ");

  const metaItems = [
    { label: "Formato", value: formatLabel(anime.format) },
    { label: "Situação", value: statusLabel(anime.status) },
    {
      label: "Episódios",
      value: anime.totalEpisodes ? String(anime.totalEpisodes) : null,
    },
    { label: "Duração", value: anime.duration ? `${anime.duration} min` : null },
    { label: "Temporada", value: seasonText || null },
    { label: "Estúdio", value: anime.studios.join(", ") || null },
    {
      label: "Popularidade",
      value: anime.popularity
        ? `${anime.popularity.toLocaleString("pt-BR")} usuários`
        : null,
    },
  ].filter((item): item is { label: string; value: string } => !!item.value);

  const description = anime.description ?? "";
  const isDescriptionLong = description.length > DESCRIPTION_CLAMP_CHARS;

  return (
    <Box width="100%">
      {anime.bannerImage && (
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: { xs: 140, md: 240 },
            borderRadius: 2,
            overflow: "hidden",
            mb: 4,
          }}
        >
          <Image
            src={anime.bannerImage}
            alt={anime.title}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </Box>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} sm="auto">
          <Image
            src={anime.image}
            alt={anime.title}
            width={230}
            height={325}
            priority
            draggable={false}
            style={{ borderRadius: 8, objectFit: "cover" }}
          />
        </Grid>

        <Grid item xs={12} sm>
          <Typography variant="h4" fontWeight={500}>
            {anime.title}
          </Typography>
          {!!anime.titleEnglish && anime.titleEnglish !== anime.title && (
            <Typography variant="subtitle1" color="text.disabled" mb={1}>
              {anime.titleEnglish}
            </Typography>
          )}

          <Box mt={2} mb={2}>
            <AnimeScoreRating
              score={anime.score}
              favourites={anime.favourites}
            />
          </Box>

          {!!allTimeRankings.length && (
            <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
              {allTimeRankings.map((ranking) => (
                <Chip
                  key={`${ranking.type}-${ranking.rank}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={rankLabel(ranking)}
                />
              ))}
            </Stack>
          )}

          {/* Os itens são filtrados antes de virar JSX: o Stack conta cada
              filho para posicionar os divisores, e um MetaItem que devolve
              null deixaria a barrinha sobrando no meio da linha. */}
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={4}
            rowGap={2}
            mb={3}
            divider={<Divider orientation="vertical" flexItem />}
          >
            {metaItems.map((item) => (
              <MetaItem key={item.label} label={item.label} value={item.value} />
            ))}
          </Stack>

          {!!anime.nextEpisode && (
            <NextEpisode
              nextEpisode={anime.nextEpisode}
              status={anime.status}
            />
          )}

          {!!anime.genres?.length && (
            <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
              {anime.genres.map((genre) => (
                <Chip
                  key={genre}
                  size="small"
                  color="primary"
                  label={genreLabel(genre)}
                />
              ))}
            </Stack>
          )}

          {!!description && (
            <Box mb={3} maxWidth={900}>
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-line",
                  // O clamp só entra em sinopses longas: aplicá-lo sempre
                  // cortaria as curtas na última linha sem necessidade.
                  ...(isDescriptionLong &&
                    !descriptionOpen && {
                      display: "-webkit-box",
                      WebkitLineClamp: DESCRIPTION_CLAMP_LINES,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }),
                }}
              >
                {description}
              </Typography>
              {isDescriptionLong && (
                <Button
                  size="small"
                  onClick={() => setDescriptionOpen((open) => !open)}
                  sx={{ mt: 0.5, px: 0 }}
                >
                  {descriptionOpen ? "Ler menos" : "Ler mais"}
                </Button>
              )}
            </Box>
          )}

          {!!anime.trailer && <AnimeTrailer trailer={anime.trailer} />}

          <Stack direction="row" flexWrap="wrap" gap={2}>
            {!!anime.malUrl && (
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                href={anime.malUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver no MyAnimeList
              </Button>
            )}
            {!!anime.siteUrl && (
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                href={anime.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver no AniList
              </Button>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnimeDetails;
