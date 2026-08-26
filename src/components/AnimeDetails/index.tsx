import { AnimeScoreRating } from "@/components/AnimeScore";
import AnimeTrailer from "@/components/AnimeTrailer";
import NextEpisode from "@/components/NextEpisode";
import { formatLabel, genreLabel, seasonLabel, statusLabel } from "@/utils/anime";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import Image from "next/image";

const MetaItem = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;

  return (
    <Box>
      <Typography variant="caption" color="text.disabled" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
};

const rankLabel = (ranking: AnimeRankingProps) =>
  `#${ranking.rank} ${
    ranking.type === "RATED" ? "melhor avaliado" : "mais popular"
  } de todos os tempos`;

const AnimeDetails = ({ anime }: { anime: AnimeDetailsProps }) => {
  const allTimeRankings = anime.rankings.filter((ranking) => ranking.allTime);
  const seasonText = [seasonLabel(anime.season), anime.seasonYear]
    .filter(Boolean)
    .join(" de ");

  return (
    <Box width="100%">
      {anime.bannerImage && (
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: { xs: 140, md: 240 },
            borderRadius: 2,
            overflow: "hidden",
            mb: 4,
          }}
        >
          <Image
            src={anime.bannerImage}
            alt={anime.title}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </Box>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} sm="auto">
          <Image
            src={anime.image}
            alt={anime.title}
            width={230}
            height={325}
            priority
            draggable={false}
            style={{ borderRadius: 8, objectFit: "cover" }}
          />
        </Grid>

        <Grid item xs={12} sm>
          <Typography variant="h4" fontWeight={500}>
            {anime.title}
          </Typography>
          {!!anime.titleEnglish && anime.titleEnglish !== anime.title && (
            <Typography variant="subtitle1" color="text.disabled" mb={1}>
              {anime.titleEnglish}
            </Typography>
          )}

          <Box mt={2} mb={2}>
            <AnimeScoreRating
              score={anime.score}
              favourites={anime.favourites}
            />
          </Box>

          {!!allTimeRankings.length && (
            <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
              {allTimeRankings.map((ranking) => (
                <Chip
                  key={`${ranking.type}-${ranking.rank}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={rankLabel(ranking)}
                />
              ))}
            </Stack>
          )}

          <Stack
            direction="row"
            flexWrap="wrap"
            gap={4}
            rowGap={2}
            mb={3}
            divider={<Divider orientation="vertical" flexItem />}
          >
            <MetaItem label="Formato" value={formatLabel(anime.format)} />
            <MetaItem label="Situação" value={statusLabel(anime.status)} />
            <MetaItem
              label="Episódios"
              value={anime.totalEpisodes ? String(anime.totalEpisodes) : null}
            />
            <MetaItem
              label="Duração"
              value={anime.duration ? `${anime.duration} min` : null}
            />
            <MetaItem label="Temporada" value={seasonText || null} />
            <MetaItem
              label="Estúdio"
              value={anime.studios.join(", ") || null}
            />
            <MetaItem
              label="Popularidade"
              value={
                anime.popularity
                  ? `${anime.popularity.toLocaleString("pt-BR")} usuários`
                  : null
              }
            />
          </Stack>

          {!!anime.nextEpisode && (
            <NextEpisode
              nextEpisode={anime.nextEpisode}
              status={anime.status}
            />
          )}

          {!!anime.genres?.length && (
            <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
              {anime.genres.map((genre) => (
                <Chip
                  key={genre}
                  size="small"
                  color="primary"
                  label={genreLabel(genre)}
                />
              ))}
            </Stack>
          )}

          {!!anime.description && (
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-line", maxWidth: 900 }}
              mb={3}
            >
              {anime.description}
            </Typography>
          )}

          {!!anime.trailer && <AnimeTrailer trailer={anime.trailer} />}

          <Stack direction="row" flexWrap="wrap" gap={2}>
            {!!anime.malUrl && (
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                href={anime.malUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver no MyAnimeList
              </Button>
            )}
            {!!anime.siteUrl && (
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                href={anime.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver no AniList
              </Button>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnimeDetails;
