import {
  Box,
  Button,
  Grid,
  Skeleton,
  Typography,
  useTheme,
} from "@mui/material";
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

  const gridItemProps = {
    sx: {
      pl: "0px !important",
      [theme.breakpoints.up("xs")]: {
        display: "flex",
        justifyContent: "center",
      },
    },
    xl: 1.2,
    lg: 2,
    md: 2.4,
    sm: 4,
    xs: 12,
  } as const;

  const hasResults = !loading && (animeData?.results?.length ?? 0) > 0;

  return (
    <Box width="100%">
      <Box gap={5}>
        <Typography
          variant="h4"
          fontWeight={500}
          sx={{
            userSelect: "none",
            textAlign: "start",
            [theme.breakpoints.down("sm")]: {
              fontSize: "1.6rem",
              textAlign: "center",
            },
          }}
        >
          {title}
        </Typography>
      </Box>

      <Grid container maxWidth="100%" m={0} spacing={4}>
        {loading &&
          SKELETON_PLACEHOLDERS.map((_, index) => (
            <Grid key={index} item {...gridItemProps}>
              <Box width={180}>
                <Skeleton variant="rounded" height={254} />
                <Skeleton variant="text" sx={{ mt: 0.5 }} />
                <Skeleton variant="text" sx={{ width: "80%", mt: 0.5 }} />
              </Box>
            </Grid>
          ))}

        {hasResults &&
          animeData.results.map((anime, index) => (
            <Grid key={anime.id + index} item {...gridItemProps}>
              <Link href={`/anime/${anime.id}`}>
                <AnimeCard anime={anime} />
              </Link>
            </Grid>
          ))}

        {!loading && !hasResults && (
          <Grid item sx={{ pl: "0px !important" }}>
            <Typography>{emptyMessage}</Typography>
          </Grid>
        )}

        <Grid
          item
          sx={{ pl: "0px !important", pt: "1rem !important" }}
          xs={12}
          display="flex"
          gap={2}
        >
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
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnimeGrid;
