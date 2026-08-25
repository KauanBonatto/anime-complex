import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import {
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";

const EPISODES_PER_PAGE = 60;

const AnimeEpisodesGrid = ({
  anime,
  currentEpisode,
}: {
  anime: AnimeDetailsProps;
  currentEpisode?: number;
}) => {
  const theme = useTheme();
  const [page, setPage] = useState(
    currentEpisode ? Math.floor((currentEpisode - 1) / EPISODES_PER_PAGE) : 0
  );

  const totalPages = Math.ceil(anime.availableEpisodes / EPISODES_PER_PAGE);
  const firstEpisode = page * EPISODES_PER_PAGE + 1;
  const episodes = Array.from(
    { length: Math.min(EPISODES_PER_PAGE, anime.availableEpisodes - page * EPISODES_PER_PAGE) },
    (_, index) => firstEpisode + index
  );

  if (!anime.availableEpisodes) {
    return (
      <Box width="100%">
        <Typography variant="h4" fontWeight={500} mb={2}>
          Episódios
        </Typography>
        <Typography>
          Este anime ainda não tem episódios exibidos.
        </Typography>
      </Box>
    );
  }

  return (
    <Box width="100%">
      <Typography
        variant="h4"
        fontWeight={500}
        sx={{
          userSelect: "none",
          mb: 2,
          [theme.breakpoints.down("sm")]: {
            fontSize: "1.6rem",
            textAlign: "center",
          },
        }}
      >
        Episódios
        <Typography component="span" variant="body2" color="text.disabled">
          {" "}
          ({anime.availableEpisodes} disponíveis)
        </Typography>
      </Typography>

      <Grid container spacing={1.5}>
        {episodes.map((episodeNumber) => {
          const isCurrent = episodeNumber === currentEpisode;

          return (
            <Grid item key={episodeNumber}>
              <Link href={`/anime/${anime.id}/${episodeNumber}`}>
                <Paper
                  elevation={0}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    width: 82,
                    height: 52,
                    borderRadius: 1,
                    transition: ".2s",
                    border: `1px solid ${theme.palette.primary.main}`,
                    backgroundColor: isCurrent
                      ? theme.palette.primary.main
                      : "transparent",
                    color: isCurrent
                      ? theme.palette.primary.contrastText
                      : theme.palette.primary.main,
                    ":hover": {
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                    },
                  }}
                >
                  <PlayCircleOutlineIcon sx={{ fontSize: "1.1rem" }} />
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="inherit"
                  >
                    {episodeNumber}
                  </Typography>
                </Paper>
              </Link>
            </Grid>
          );
        })}
      </Grid>

      {totalPages > 1 && (
        <Box display="flex" alignItems="center" gap={2} mt={3}>
          <Button
            variant="outlined"
            disabled={page === 0}
            onClick={() => setPage((prevPage) => prevPage - 1)}
          >
            Anterior
          </Button>
          <Typography variant="body2" color="text.disabled">
            {page + 1} de {totalPages}
          </Typography>
          <Button
            variant="outlined"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((prevPage) => prevPage + 1)}
          >
            Próximo
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default AnimeEpisodesGrid;
