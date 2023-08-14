import { Paper, Typography } from "@mui/material";
import Image from "next/image";

const AnimeCard = ({ anime }: { anime: AnimeProps }) => {
  return (
    <Paper elevation={0} sx={{ width: 180 }}>
      <Image
        style={{ borderRadius: 8 }}
        alt={anime.title} 
        src={anime.image} 
        draggable={false}
        width={180} 
        height={254} 
      />
      <Typography variant="body2" fontWeight={500}>{anime.title}</Typography>
    </Paper>
  );
};

export default AnimeCard;