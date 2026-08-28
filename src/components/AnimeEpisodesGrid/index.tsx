"use client";

import EpisodeCard from "@/components/EpisodeCard";
import { Box, Button, TextField, Typography, useTheme } from "@mui/material";
import { useState } from "react";

/**
 * Os cards agora carregam imagem, então a página é bem menor que a antiga de
 * sessenta quadradinhos numerados.
 */
const EPISODES_PER_PAGE = 24;

/** Acima disso a paginação sozinha vira um exercício de paciência. */
const JUMP_FIELD_THRESHOLD = 100;

/** Um episódio sem dado nenhum ainda precisa aparecer e ser clicável. */
const placeholderEpisode = (
  number: number,
  duration: number | null
): EpisodeInfoProps => ({
  number,
  title: null,
  thumbnail: null,
  airedAt: null,
  duration,
  overview: null,
});

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
  const [jumpTo, setJumpTo] = useState("");

  const totalPages = Math.ceil(anime.availableEpisodes / EPISODES_PER_PAGE);
  const firstEpisode = page * EPISODES_PER_PAGE + 1;
  const episodes = Array.from(
    {
      length: Math.min(
        EPISODES_PER_PAGE,
        anime.availableEpisodes - page * EPISODES_PER_PAGE
      ),
    },
    (_, index) => {
      const number = firstEpisode + index;
      return anime.episodes?.[number] ?? placeholderEpisode(number, anime.duration);
    }
  );

  /** Leva direto à página que contém o episódio pedido. */
  const handleJump = (event: React.FormEvent) => {
    event.preventDefault();
    const target = Number(jumpTo);
    if (!target || target < 1 || target > anime.availableEpisodes) return;

    setPage(Math.floor((target - 1) / EPISODES_PER_PAGE));
    setJumpTo("");
  };

  if (!anime.availableEpisodes) {
    return (
      <Box width="100%">
        <Typography variant="h4" fontWeight={500} mb={2}>
          Episódios
        </Typography>
        <Typography>Este anime ainda não tem episódios exibidos.</Typography>
      </Box>
    );
  }

  return (
    <Box width="100%">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          fontWeight={500}
          sx={{
            userSelect: "none",
            [theme.breakpoints.down("sm")]: { fontSize: "1.6rem" },
          }}
        >
          Episódios
          <Typography component="span" variant="body2" color="text.disabled">
            {" "}
            ({anime.availableEpisodes} disponíveis)
          </Typography>
        </Typography>

        {anime.availableEpisodes > JUMP_FIELD_THRESHOLD && (
          <Box component="form" onSubmit={handleJump}>
            <TextField
              size="small"
              type="number"
              value={jumpTo}
              label="Ir para o episódio"
              onChange={(event) => setJumpTo(event.target.value)}
              inputProps={{ min: 1, max: anime.availableEpisodes }}
              sx={{ width: 180 }}
            />
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          [theme.breakpoints.down("sm")]: {
            gap: 1.5,
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          },
        }}
      >
        {episodes.map((episode) => (
          <EpisodeCard
            key={episode.number}
            animeId={anime.id}
            episode={episode}
            isCurrent={episode.number === currentEpisode}
          />
        ))}
      </Box>

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
