import { AnimeScoreRating } from "@/components/AnimeScore";
import MetaItem from "@/components/MetaItem";
import { genreLabel, rankLabel } from "@/utils/anime";
import {
  mangaFormatLabel,
  mangaStatusLabel,
  publicationYearsLabel,
} from "@/utils/manga";
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

const MangaDetails = ({ manga }: { manga: MangaDetailsProps }) => {
  const allTimeRankings = manga.rankings.filter((ranking) => ranking.allTime);

  // Mangás longos costumam ficar sem contagem de capítulos ou volumes no
  // AniList. Montamos a lista já sem os vazios porque o Stack desenha uma
  // divisória por filho — inclusive pelos que não renderizam nada.
  const metaItems = [
    { label: "Formato", value: mangaFormatLabel(manga.format) },
    { label: "Situação", value: mangaStatusLabel(manga.status) },
    {
      label: "Capítulos",
      value: manga.totalChapters ? String(manga.totalChapters) : null,
    },
    {
      label: "Volumes",
      value: manga.totalVolumes ? String(manga.totalVolumes) : null,
    },
    {
      label: "Publicação",
      value: publicationYearsLabel(manga.startYear, manga.endYear, manga.status),
    },
    { label: "Autoria", value: manga.authors.join(", ") || null },
    {
      label: "Popularidade",
      value: manga.popularity
        ? `${manga.popularity.toLocaleString("pt-BR")} usuários`
        : null,
    },
  ].filter((item) => !!item.value);

  return (
    <Box width="100%">
      {manga.bannerImage && (
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
            src={manga.bannerImage}
            alt={manga.title}
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
            src={manga.image}
            alt={manga.title}
            width={230}
            height={325}
            priority
            draggable={false}
            style={{ borderRadius: 8, objectFit: "cover" }}
          />
        </Grid>

        <Grid item xs={12} sm>
          <Typography variant="h4" fontWeight={500}>
            {manga.title}
          </Typography>
          {!!manga.titleEnglish && manga.titleEnglish !== manga.title && (
            <Typography variant="subtitle1" color="text.disabled" mb={1}>
              {manga.titleEnglish}
            </Typography>
          )}

          <Box mt={2} mb={2}>
            <AnimeScoreRating
              score={manga.score}
              favourites={manga.favourites}
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
            {metaItems.map((item) => (
              <MetaItem key={item.label} label={item.label} value={item.value} />
            ))}
          </Stack>

          {!!manga.genres?.length && (
            <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
              {manga.genres.map((genre) => (
                <Chip
                  key={genre}
                  size="small"
                  color="primary"
                  label={genreLabel(genre)}
                />
              ))}
            </Stack>
          )}

          {!!manga.description && (
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-line", maxWidth: 900 }}
              mb={3}
            >
              {manga.description}
            </Typography>
          )}

          <Stack direction="row" flexWrap="wrap" gap={2}>
            {!!manga.malUrl && (
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                href={manga.malUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver no MyAnimeList
              </Button>
            )}
            {!!manga.siteUrl && (
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                href={manga.siteUrl}
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

export default MangaDetails;
