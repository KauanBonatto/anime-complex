import { Paper, Typography } from "@mui/material";
import Image from "next/image";

const AnimeCard = ({ anime }: { anime: AnimeProps }) => {
  return (
    <Paper elevation={3} sx={{ width: 180, backgroundColor: '#0e000f' }}>
      <Image
        style={{ borderRadius: 4 }}
        alt={anime.title} 
        src={anime.image} 
        draggable={false}
        width={180} 
        height={254} 
      />
      <Typography>{anime.title}</Typography>
    </Paper>
  );
};

export default AnimeCard;