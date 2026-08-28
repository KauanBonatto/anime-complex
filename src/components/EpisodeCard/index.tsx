import EpisodeThumb from "@/components/EpisodeThumb";
import { durationLabel, episodeDateLabel } from "@/utils/anime";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, Paper, Stack, Typography, alpha } from "@mui/material";
import Link from "next/link";

interface EpisodeCardProps {
  animeId: string;
  episode: EpisodeInfoProps;
  /** Destaca o episódio que está sendo assistido. */
  isCurrent?: boolean;
  /** Linha estreita, usada no aside da tela do episódio. */
  compact?: boolean;
}

const EpisodeCard = ({
  animeId,
  episode,
  isCurrent = false,
  compact = false,
}: EpisodeCardProps) => {
  const href = `/anime/${animeId}/${episode.number}`;
  const label = `Episódio ${episode.number}`;
  const duration = durationLabel(episode.duration);

  if (compact) {
    return (
      <Paper
        component={Link}
        href={href}
        elevation={0}
        aria-current={isCurrent ? "true" : undefined}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          p: 0.75,
          borderRadius: 1.5,
          textDecoration: "none",
          transition: ".2s",
          backgroundColor: (theme) =>
            isCurrent ? alpha(theme.palette.primary.main, 0.14) : "transparent",
          border: (theme) =>
            `1px solid ${
              isCurrent ? theme.palette.primary.main : "transparent"
            }`,
          ":hover": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        <Box
          sx={{ flexShrink: 0, width: 96, borderRadius: 1, overflow: "hidden" }}
        >
          <EpisodeThumb
            compact
            src={episode.thumbnail}
            alt={label}
            fallbackLabel={String(episode.number)}
            sizes="96px"
          />
        </Box>

        <Stack sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="caption" color="text.disabled" fontWeight={600}>
            EP {episode.number}
            {isCurrent && " · assistindo"}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={isCurrent ? 700 : 500}
            title={episode.title ?? label}
            noWrap
          >
            {episode.title ?? label}
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      component={Link}
      href={href}
      elevation={0}
      aria-current={isCurrent ? "true" : undefined}
      sx={{
        display: "block",
        height: "100%",
        borderRadius: 2,
        overflow: "hidden",
        textDecoration: "none",
        transition: ".2s",
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
        border: (theme) =>
          `1px solid ${
            isCurrent
              ? theme.palette.primary.main
              : alpha(theme.palette.primary.main, 0.15)
          }`,
        ":hover": {
          borderColor: "primary.main",
          ".episode-thumb": { transform: "scale(1.05)" },
          ".episode-play": { opacity: 1 },
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <EpisodeThumb
          src={episode.thumbnail}
          alt={label}
          fallbackLabel={`EP ${episode.number}`}
          sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 280px"
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

        {/* Número e duração ficam sobre a imagem para o texto abaixo sobrar
            inteiro para o título, que é o que varia de episódio para episódio. */}
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
              "linear-gradient(180deg, transparent 0%, rgba(14,0,15,0.85) 100%)",
            pointerEvents: "none",
          }}
        >
          <Typography variant="caption" fontWeight={700} sx={{ color: "#fff" }}>
            EP {episode.number}
          </Typography>
          {!!duration && (
            <Typography
              variant="caption"
              sx={{ color: "#fff", opacity: 0.85 }}
            >
              {duration}
            </Typography>
          )}
        </Stack>
      </Box>

      <Stack sx={{ p: 1.25, gap: 0.25 }}>
        <Typography
          variant="body2"
          fontWeight={isCurrent ? 700 : 500}
          title={episode.title ?? label}
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "2.5em",
          }}
        >
          {episode.title ?? label}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {isCurrent
            ? "Assistindo agora"
            : episode.airedAt
            ? episodeDateLabel(episode.airedAt)
            : " "}
        </Typography>
      </Stack>
    </Paper>
  );
};

export default EpisodeCard;
