import { AnimeScoreBadge } from "@/components/AnimeScore";
import { animeMetaLine } from "@/utils/anime";
import { Box, Chip, Paper, Typography } from "@mui/material";
import Image from "next/image";

const AnimeCard = ({ anime }: { anime: AnimeProps }) => {
  const metaLine = animeMetaLine(anime);

  return (
    <Paper
      elevation={0}
      sx={{
        width: 180,
        backgroundColor: "transparent",
        ":hover": {
          ".anime-image": { filter: "brightness(0.6)" },
        },
      }}
    >
      <Box sx={{ position: "relative", width: 180, height: 254 }}>
        <Image
          className="anime-image"
          style={{ borderRadius: 8, transition: ".3s", objectFit: "cover" }}
          alt={anime.title}
          src={anime.image}
          draggable={false}
          width={180}
          height={254}
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

export default AnimeCard;
