import { Box, Button, Skeleton, Typography, useTheme } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import AnimeCard from "./AnimeCard";

const SKELETON_PLACEHOLDERS = Array.from({ length: 12 });

const AnimeGrid = ({
  title,
  loading,
  animeData,
  getAnimeData,
  resetToken,
  emptyMessage = "Nenhum anime encontrado com os parâmetros informados!",
  media = "anime",
}: AnimeGridProps) => {
  const theme = useTheme();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [currentToken, setCurrentToken] = useState(resetToken);

  // Ao trocar os filtros voltamos para a primeira página antes do fetch.
  if (resetToken !== currentToken) {
    setCurrentToken(resetToken);
    setPageNumber(1);
  }

  const handleNextPage = () => {
    if (animeData?.hasNextPage) {
      setPageNumber((prevState) => prevState + 1);
    }
  };

  const handlePrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber((prevState) => prevState - 1);
    }
  };

  useEffect(() => {
    getAnimeData(pageNumber);
  }, [getAnimeData, pageNumber]);

  const hasResults = !loading && (animeData?.results?.length ?? 0) > 0;

  // Colunas fluidas: os cards nunca encostam porque o gap é fixo e a largura
  // de cada coluna se ajusta ao espaço disponível.
  const gridSx = {
    display: "grid",
    width: "100%",
    gap: 3,
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    [theme.breakpoints.down("sm")]: {
      gap: 2,
      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    },
  } as const;

  return (
    <Box width="100%">
      <Typography
        variant="h4"
        fontWeight={500}
        sx={{
          userSelect: "none",
          textAlign: "start",
          mb: 3,
          [theme.breakpoints.down("sm")]: {
            fontSize: "1.6rem",
            textAlign: "center",
          },
        }}
      >
        {title}
      </Typography>

      <Box sx={gridSx}>
        {loading &&
          SKELETON_PLACEHOLDERS.map((_, index) => (
            <Box key={index} width="100%">
              <Skeleton
                variant="rounded"
                sx={{ width: "100%", height: "auto", aspectRatio: "180 / 254" }}
              />
              <Skeleton variant="text" sx={{ mt: 0.5 }} />
              <Skeleton variant="text" sx={{ width: "80%", mt: 0.5 }} />
            </Box>
          ))}

        {hasResults &&
          animeData.results.map((anime, index) => (
            <Link key={anime.id + index} href={`/${media}/${anime.id}`}>
              <AnimeCard anime={anime} media={media} />
            </Link>
          ))}
      </Box>

      {!loading && !hasResults && <Typography>{emptyMessage}</Typography>}

      <Box display="flex" gap={2} mt={4}>
        <Button
          onClick={handlePrevPage}
          disabled={loading || pageNumber == 1}
          variant="outlined"
        >
          Anterior
        </Button>
        <Button
          onClick={handleNextPage}
          disabled={loading || !animeData?.hasNextPage}
          variant="outlined"
        >
          Próximo
        </Button>
      </Box>
    </Box>
  );
};

export default AnimeGrid;
