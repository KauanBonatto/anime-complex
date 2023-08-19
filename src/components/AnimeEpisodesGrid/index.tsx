import { Box, Grid, Skeleton, Typography, useTheme } from "@mui/material";
import Link from "next/link";
import { Fragment } from "react";
import AnimeEpisodeCard from "./AnimeEpisodeCard";

const AnimeEpisodesGrid = ({
  loading,
  animeInfo,
}: {
  loading: boolean;
  animeInfo: AnimeInfoProps;
}) => {
  const theme = useTheme();

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
          {animeInfo.title}
        </Typography>
      </Box>

      <Grid container maxWidth="100%" m={0} spacing={4}>
        {!loading && animeInfo.episodes && animeInfo.episodes?.length > 0 ? (
          animeInfo.episodes.map((episode, index) => (
            <Grid
              key={episode.id + index}
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
              <Link
                key={episode.id}
                href={`/anime/${animeInfo.id}/${episode.id}`}
              >
                <AnimeEpisodeCard animeInfo={animeInfo} episodeIndex={index} />
              </Link>
            </Grid>
          ))
        ) : (
          <Fragment>
            {(
              animeInfo.episodes ?? ["", "", "", "", "", "", "", "", "", ""]
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
            ))}
          </Fragment>
        )}
      </Grid>
    </Box>
  );
};

export default AnimeEpisodesGrid;
