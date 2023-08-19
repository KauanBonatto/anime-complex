import {
  Box,
  Button,
  Grid,
  Skeleton,
  Typography,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import AnimeCard from "./AnimeCard";

const AnimeGrid = ({
  title,
  loading,
  animeData,
  getAnimeData,
}: AnimeGridProps) => {
  const theme = useTheme();
  const [pageNumber, setPageNumber] = useState<number>(1);

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
        {!loading && animeData?.results && animeData?.results?.length > 0 ? (
          animeData?.results.map((anime, index) => (
            <Grid
              key={anime.id + index}
              item
              sx={{
                pl: "0px !important",
                [theme.breakpoints.up("xs")]: {
                  display: "flex",
                  justifyContent: "center",
                },
              }}
              xl={1.2}
              lg={2}
              md={2.4}
              sm={4}
              xs={12}
            >
              <Link href={`/anime/${anime.id}`}>
                <AnimeCard anime={anime} />
              </Link>
            </Grid>
          ))
        ) : (
          <Fragment>
            {animeData?.results?.length != 0 ? (
              (
                animeData?.results ?? ["", "", "", "", "", "", "", "", "", ""]
              ).map((_, index) => (
                <Grid
                  key={index}
                  item
                  sx={{ pl: "0px !important" }}
                  xl={1.2}
                  lg={2}
                  md={2.4}
                  sm={4}
                  xs={12}
                >
                  <Box width={180}>
                    <Skeleton variant="rounded" height={254} />
                    <Skeleton variant="text" sx={{ mt: 0.5 }} />
                    <Skeleton variant="text" sx={{ width: "80%", mt: 0.5 }} />
                  </Box>
                </Grid>
              ))
            ) : (
              <Grid item sx={{ pl: "0px !important" }}>
                <Typography>
                  Nenhum anime encontrado com os parâmetros informados!
                </Typography>
              </Grid>
            )}
          </Fragment>
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
            disabled={pageNumber == 1}
            variant="outlined"
          >
            Anterior
          </Button>
          <Button
            onClick={handleNextPage}
            disabled={!animeData?.hasNextPage}
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
