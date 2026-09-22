"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";
import FadingImage from "@/components/FadingImage";
import Link from "next/link";
import { usePrefetchOnHover } from "@/hooks/usePrefetchOnHover";
import AnilistService from "@/services/AnilistService";
import { translucent } from "@/theme/translucent";

/**
 * Temporadas da franquia. No AniList cada temporada é uma obra com ID próprio,
 * então elas ficavam invisíveis umas para as outras — quem abria a 2ª não
 * tinha como chegar na 1ª sem voltar para a busca.
 *
 * Renderiza nada quando só há uma temporada: aí não existe navegação a fazer.
 */
const SeasonStrip = ({ seasons }: { seasons: FranchiseSeasonProps[] }) => {
  if (seasons.length < 2) return null;

  return (
    <Box width="100%">
      <Typography variant="h5" fontWeight={500} mb={2}>
        Temporadas
      </Typography>

      <Stack
        className="faixa-rolavel"
        direction="row"
        gap={2}
        sx={{
          // A faixa rola sozinha; sem isto o excesso empurraria a página toda.
          // A barra é a nativa, a mesma da página — ver globals.css.
          overflowX: "auto",
          pb: 1,
        }}
      >
        {seasons.map((season) => (
          <SeasonCard key={season.id} season={season} />
        ))}
      </Stack>
    </Box>
  );
};

/** Uma temporada da faixa. Componente próprio pelo hook de prefetch. */
const SeasonCard = ({ season }: { season: FranchiseSeasonProps }) => {
  return (
    <Paper
      component={Link}
      href={`/anime/${season.id}`}
      elevation={0}
      aria-current={season.isCurrent ? "true" : undefined}
      {...usePrefetchOnHover(() => AnilistService.getAnimeDetails(season.id))}
      sx={{
        display: "flex",
        gap: 1.25,
        flexShrink: 0,
        width: 240,
        p: 1,
        borderRadius: 2,
        textDecoration: "none",
        transition: "border-color .2s ease",
        backgroundColor: (theme) =>
          season.isCurrent
            ? translucent(theme.vars.palette.primary.mainChannel, 0.12)
            : translucent(theme.vars.palette.primary.mainChannel, 0.04),
        border: (theme) =>
          `1px solid ${
            season.isCurrent
              ? theme.vars.palette.primary.main
              : translucent(theme.vars.palette.primary.mainChannel, 0.15)
          }`,
        ":hover": { borderColor: "primary.main" },
      }}
    >
      {!!season.cover && (
        <Box
          sx={{
            position: "relative",
            flexShrink: 0,
            width: 54,
            aspectRatio: "180 / 254",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <FadingImage
            src={season.cover}
            alt=""
            aria-hidden
            fill
            sizes="54px"
            draggable={false}
            style={{ objectFit: "cover" }}
          />
        </Box>
      )}

      <Stack sx={{ minWidth: 0, justifyContent: "center", gap: 0.25 }}>
        <Typography
          variant="caption"
          fontWeight={700}
          color={season.isCurrent ? "primary.main" : "text.disabled"}
        >
          {season.label}
          {season.isCurrent && " · atual"}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={500}
          title={season.title}
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {season.title}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {[
            season.year,
            season.totalEpisodes ? `${season.totalEpisodes} eps` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
      </Stack>
    </Paper>
  );
};

export default SeasonStrip;
