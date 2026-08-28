"use client";

import EpisodeCard from "@/components/EpisodeCard";
import { useEpisodeCatalog } from "@/hooks/useEpisodeCatalog";
import { NAVBAR_HEIGHT } from "@/components/PageShell/height";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

/** Folga entre o cabeçalho fixo e o topo do aside. */
const STICKY_GAP = 16;

interface EpisodeListAsideProps {
  anime: AnimeDetailsProps;
  /** Vazio enquanto a franquia carrega, ou quando a obra é avulsa. */
  seasons: FranchiseSeasonProps[];
  currentEpisode: number;
  /**
   * Falso enquanto a tradução do TMDB não chegou. A tela do episódio mostra o
   * aside antes disso, para o player não esperar, e sem esta ressalva o
   * catálogo pediria a vizinhança de um episódio que está para chegar sozinho.
   */
  localized?: boolean;
}

/**
 * Lista de episódios ao lado do player. Antes era preciso rolar até o fim da
 * página para trocar de episódio; aqui ela acompanha o vídeo e já abre rolada
 * até o episódio que está tocando.
 *
 * As temporadas que não são a atual não carregam episódios: cada uma é uma
 * obra separada no AniList e exigiria uma requisição própria. Elas viram um
 * atalho para a ficha daquela temporada.
 */
const EpisodeListAside = ({
  anime,
  seasons,
  currentEpisode,
  localized = true,
}: EpisodeListAsideProps) => {
  const hasSeasons = seasons.length > 1;
  const catalog = useEpisodeCatalog(anime, localized ? [currentEpisode] : []);

  return (
    <Box
      component="aside"
      sx={{
        position: { xs: "static", lg: "sticky" },
        top: NAVBAR_HEIGHT + STICKY_GAP,
        maxHeight: {
          xs: 460,
          lg: `calc(100vh - ${NAVBAR_HEIGHT + STICKY_GAP * 2}px)`,
        },
        overflowY: "auto",
        borderRadius: 2,
        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        p: 1,
        "&::-webkit-scrollbar": { width: 6 },
        "&::-webkit-scrollbar-thumb": {
          borderRadius: 3,
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.3),
        },
      }}
    >
      {!hasSeasons ? (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ px: 1, py: 1 }}>
            Episódios
            <Typography component="span" variant="caption" color="text.disabled">
              {" "}
              ({anime.availableEpisodes})
            </Typography>
          </Typography>
          <EpisodeList
            anime={anime}
            catalog={catalog}
            currentEpisode={currentEpisode}
          />
        </>
      ) : (
        seasons.map((season) =>
          season.isCurrent ? (
            <Accordion
              key={season.id}
              defaultExpanded
              disableGutters
              elevation={0}
              sx={{ backgroundColor: "transparent", "::before": { display: "none" } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {season.label}
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.disabled"
                  >
                    {" "}
                    ({anime.availableEpisodes} eps)
                  </Typography>
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <EpisodeList
                  anime={anime}
                  catalog={catalog}
                  currentEpisode={currentEpisode}
                />
              </AccordionDetails>
            </Accordion>
          ) : (
            <Accordion
              key={season.id}
              disableGutters
              elevation={0}
              sx={{ backgroundColor: "transparent", "::before": { display: "none" } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" fontWeight={500}>
                  {season.label}
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.disabled"
                  >
                    {" "}
                    ({season.totalEpisodes || "?"} eps)
                  </Typography>
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1 }}>
                <SeasonShortcut season={season} />
              </AccordionDetails>
            </Accordion>
          )
        )
      )}
    </Box>
  );
};

/** Episódios da temporada aberta, já rolados até o que está tocando. */
const EpisodeList = ({
  anime,
  catalog,
  currentEpisode,
}: {
  anime: AnimeDetailsProps;
  catalog: Record<number, EpisodeInfoProps>;
  currentEpisode: number;
}) => {
  const currentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // `nearest` rola só o aside; `center` arrastaria a página inteira junto.
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentEpisode]);

  const episodes = Array.from(
    { length: anime.availableEpisodes },
    (_, index) => index + 1
  );

  if (!episodes.length) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ p: 1 }}>
        Nenhum episódio exibido ainda.
      </Typography>
    );
  }

  return (
    <Stack gap={0.5}>
      {episodes.map((number) => {
        const isCurrent = number === currentEpisode;

        return (
          <Box key={number} ref={isCurrent ? currentRef : undefined}>
            <EpisodeCard
              compact
              animeId={anime.id}
              isCurrent={isCurrent}
              episode={
                catalog[number] ?? {
                  number,
                  title: null,
                  thumbnail: null,
                  airedAt: null,
                  duration: anime.duration,
                  overview: null,
                }
              }
            />
          </Box>
        );
      })}
    </Stack>
  );
};

/** Atalho para outra temporada, que tem ficha e episódios próprios. */
const SeasonShortcut = ({ season }: { season: FranchiseSeasonProps }) => (
  <Paper
    component={Link}
    href={`/anime/${season.id}`}
    elevation={0}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.25,
      p: 1,
      borderRadius: 1.5,
      textDecoration: "none",
      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
      ":hover": {
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
      },
    }}
  >
    {!!season.cover && (
      <Box
        sx={{
          position: "relative",
          flexShrink: 0,
          width: 44,
          aspectRatio: "180 / 254",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <Image
          src={season.cover}
          alt=""
          aria-hidden
          fill
          sizes="44px"
          style={{ objectFit: "cover" }}
        />
      </Box>
    )}
    <Stack sx={{ minWidth: 0, gap: 0.5 }}>
      <Typography variant="body2" fontWeight={500} noWrap title={season.title}>
        {season.title}
      </Typography>
      <Button size="small" variant="outlined" component="span" sx={{ alignSelf: "flex-start" }}>
        Ver temporada
      </Button>
    </Stack>
  </Paper>
);

export default EpisodeListAside;
