import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { Paper, Typography } from "@mui/material";
import Image from "next/image";

const AnimeEpisodeCard = ({
  animeInfo,
  episodeIndex,
}: {
  animeInfo: AnimeInfoProps;
  episodeIndex: number;
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        width: 180,
        position: "relative",
        ":hover": {
          ".episode-image": { filter: "brightness(0.4) !important" },
        },
      }}
    >
      <Image
        className="episode-image"
        style={{
          borderRadius: 8,
          filter: "brightness(0.6)",
          transition: ".3s",
        }}
        alt={animeInfo.title}
        src={animeInfo.image}
        draggable={false}
        width={180}
        height={254}
      />
      <PlayCircleOutlineIcon
        sx={{
          color: "#adadad",
          fontSize: "4rem",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -100%)",
        }}
      />
      <Typography variant="body2" fontWeight={500}>
        {animeInfo.title} - Episode {animeInfo.episodes[episodeIndex].number}
      </Typography>
    </Paper>
  );
};

export default AnimeEpisodeCard;
