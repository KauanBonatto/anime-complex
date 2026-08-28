import { AnimeScoreBadge } from "@/components/AnimeScore";
import EpisodeThumb from "@/components/EpisodeThumb";
import { animeMetaLine, timeAgoLabel } from "@/utils/anime";
import { mangaMetaLine } from "@/utils/manga";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
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
 * Card de "Episódios Recentes". Antes mostrava a capa da obra com os dados ao
 * lado, o que fazia a seção parecer mais catálogo que lançamento. Agora o card
 * é o episódio: arte deitada, o número em destaque, há quanto tempo saiu, e o
 * clique leva direto ao player — não à ficha.
 *
 * A lista já traz só o episódio mais recente de cada obra: a grade de exibição
 * vem ordenada por horário e o serviço remove as repetições de anime antes de
 * reordenar por popularidade.
 */
const ReleaseCard = ({ anime }: { anime: AnimeProps }) => (
  <Paper
    elevation={0}
    sx={{
      display: "block",
      width: "100%",
      height: "100%",
      borderRadius: 2,
      overflow: "hidden",
      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
      border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
      transition: ".2s",
      ":hover": {
        borderColor: "primary.main",
        ".episode-thumb": { transform: "scale(1.05)" },
        ".episode-play": { opacity: 1 },
      },
    }}
  >
    <Box sx={{ position: "relative" }}>
      {/* O banner é a arte deitada da obra; sem ele a capa vertical entra
          recortada, que ainda lê melhor que um vazio. */}
      <EpisodeThumb
        src={anime.bannerImage ?? anime.image}
        alt={anime.title}
        fallbackLabel={`EP ${anime.episodeNumber ?? ""}`.trim()}
        sizes="(max-width: 600px) 92vw, (max-width: 900px) 46vw, 320px"
      />

      <Box
        className="episode-play"
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0,
          transition: ".2s",
          backgroundColor: "rgba(14, 0, 15, 0.45)",
        }}
      >
        <PlayArrowRoundedIcon sx={{ fontSize: "3rem", color: "#fff" }} />
      </Box>

      <AnimeScoreBadge score={anime.score} />

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: "absolute",
          insetInline: 0,
          bottom: 0,
          px: 1,
          py: 0.75,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(14,0,15,0.88) 100%)",
          pointerEvents: "none",
        }}
      >
        {!!anime.episodeNumber && (
          <Typography variant="caption" fontWeight={700} sx={{ color: "#fff" }}>
            EP {anime.episodeNumber}
          </Typography>
        )}
        {!!anime.airedAt && (
          <Typography variant="caption" sx={{ color: "#fff", opacity: 0.85 }}>
            {timeAgoLabel(anime.airedAt)}
          </Typography>
        )}
      </Stack>
    </Box>

    <Typography
      variant="body2"
      fontWeight={600}
      title={anime.title}
      sx={{
        px: 1.25,
        py: 1.25,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {anime.title}
    </Typography>
  </Paper>
);

export default AnimeCard;
