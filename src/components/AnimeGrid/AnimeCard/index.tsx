import { AnimeScoreBadge, formatScore, scoreColor } from "@/components/AnimeScore";
import { animeMetaLine, timeAgoLabel } from "@/utils/anime";
import { mangaMetaLine } from "@/utils/manga";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { Box, Chip, Paper, Stack, Typography, alpha } from "@mui/material";
import Image from "next/image";

interface AnimeCardProps {
  anime: AnimeProps;
  media?: MediaType;
  variant?: AnimeCardVariant;
}

const AnimeCard = ({
  anime,
  media = "anime",
  variant = "poster",
}: AnimeCardProps) => {
  if (variant === "release") return <ReleaseCard anime={anime} />;

  const metaLine =
    media === "manga" ? mangaMetaLine(anime) : animeMetaLine(anime);

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        backgroundColor: "transparent",
        ":hover": {
          ".anime-image": { filter: "brightness(0.6)" },
        },
      }}
    >
      <Box
        sx={{ position: "relative", width: "100%", aspectRatio: "180 / 254" }}
      >
        <Image
          className="anime-image"
          style={{ borderRadius: 8, transition: ".3s", objectFit: "cover" }}
          alt={anime.title}
          src={anime.image}
          draggable={false}
          fill
          sizes="(max-width: 600px) 45vw, (max-width: 900px) 30vw, 180px"
        />
        <AnimeScoreBadge score={anime.score} />
        {!!anime.episodeNumber && (
          <Chip
            size="small"
            label={`EP ${anime.episodeNumber}`}
            sx={{
              position: "absolute",
              bottom: 8,
              left: 8,
              height: 20,
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "#fff",
              backgroundColor: "rgba(14, 0, 15, 0.78)",
            }}
          />
        )}
      </Box>

      <Typography
        variant="body2"
        fontWeight={500}
        title={anime.title}
        sx={{
          mt: 1,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {anime.title}
      </Typography>
      {!!metaLine && (
        <Typography variant="caption" color="text.disabled">
          {metaLine}
        </Typography>
      )}
    </Paper>
  );
};

/**
 * Card de "Episódios Recentes". A capa vertical do catálogo escondia o que
 * essa lista tem de próprio: qual episódio saiu e há quanto tempo. Aqui os
 * dois viram a informação principal, e a capa fica só como referência visual.
 */
const ReleaseCard = ({ anime }: { anime: AnimeProps }) => (
  <Paper
    elevation={0}
    sx={{
      display: "flex",
      gap: 1.5,
      width: "100%",
      height: "100%",
      p: 1,
      borderRadius: 2,
      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
      border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
      transition: ".2s",
      ":hover": {
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
        ".anime-image": { filter: "brightness(0.75)" },
      },
    }}
  >
    <Box
      sx={{
        position: "relative",
        flexShrink: 0,
        width: 72,
        aspectRatio: "180 / 254",
      }}
    >
      <Image
        className="anime-image"
        style={{ borderRadius: 6, transition: ".3s", objectFit: "cover" }}
        alt={anime.title}
        src={anime.image}
        draggable={false}
        fill
        sizes="72px"
      />
    </Box>

    <Stack sx={{ minWidth: 0, flexGrow: 1, py: 0.5, gap: 0.75 }}>
      <Typography
        variant="body2"
        fontWeight={600}
        title={anime.title}
        sx={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {anime.title}
      </Typography>

      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
        {!!anime.episodeNumber && (
          <Chip
            size="small"
            color="primary"
            label={`EP ${anime.episodeNumber}`}
            sx={{ height: 22, fontWeight: 700, fontSize: "0.7rem" }}
          />
        )}
        {!!anime.airedAt && (
          <Typography variant="caption" color="text.disabled">
            {timeAgoLabel(anime.airedAt)}
          </Typography>
        )}
      </Stack>

      {!!anime.score && (
        <Stack direction="row" alignItems="center" spacing={0.25} mt="auto">
          <StarRoundedIcon
            sx={{ fontSize: "0.95rem", color: scoreColor(anime.score) }}
          />
          <Typography variant="caption" fontWeight={700}>
            {formatScore(anime.score)}
          </Typography>
        </Stack>
      )}
    </Stack>
  </Paper>
);

export default AnimeCard;
