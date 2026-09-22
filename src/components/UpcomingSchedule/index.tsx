"use client";

import { translucent } from "@/theme/translucent";
import {
  airingTimeLabel,
  groupUpcomingByDay,
  timeUntilLabel,
} from "@/utils/anime";
import { Box, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FadingImage from "@/components/FadingImage";
import { usePrefetchOnHover } from "@/hooks/usePrefetchOnHover";
import AnilistService from "@/services/AnilistService";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** A contagem só muda de minuto em minuto, então não precisa de tick de 1s. */
const TICK_INTERVAL = 60 * 1000;

const CARD_WIDTH = 232;

const SKELETON_PLACEHOLDERS = Array.from({ length: 6 });

/** Um episódio agendado: capa, número, horário e quanto falta. */
const UpcomingCard = ({
  episode,
  now,
}: {
  episode: UpcomingEpisodeProps;
  now: number;
}) => {
  const secondsLeft = episode.airingAt - Math.floor(now / 1000);
  const prefetch = usePrefetchOnHover(() =>
    AnilistService.getAnimeDetails(episode.id)
  );

  return (
    <Paper
      component={Link}
      href={`/anime/${episode.id}`}
      elevation={0}
      {...prefetch}
      sx={{
        display: "flex",
        gap: 1.25,
        flexShrink: 0,
        width: CARD_WIDTH,
        p: 1,
        borderRadius: 2,
        textDecoration: "none",
        transition: "border-color .2s ease",
        backgroundColor: (theme) =>
          translucent(theme.vars.palette.primary.mainChannel, 0.04),
        border: (theme) =>
          `1px solid ${translucent(theme.vars.palette.primary.mainChannel, 0.15)}`,
        ":hover": { borderColor: "primary.main" },
      }}
    >
      <Box
        sx={{
          position: "relative",
          flexShrink: 0,
          width: 54,
          aspectRatio: "180 / 254",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <FadingImage
          src={episode.image}
          alt=""
          aria-hidden
          fill
          sizes="54px"
          draggable={false}
          style={{ objectFit: "cover" }}
        />
      </Box>

      <Stack sx={{ minWidth: 0, justifyContent: "center", gap: 0.25 }}>
        <Stack direction="row" alignItems="baseline" gap={0.75}>
          <Typography variant="caption" fontWeight={700} color="primary.main">
            EP {episode.episodeNumber}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {airingTimeLabel(episode.airingAt)}
          </Typography>
        </Stack>

        <Typography
          variant="body2"
          fontWeight={500}
          title={episode.title}
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {episode.title}
        </Typography>

        <Typography variant="caption" color="text.disabled">
          {secondsLeft > 0
            ? `em ${timeUntilLabel(secondsLeft)}`
            : timeUntilLabel(secondsLeft)}
        </Typography>
      </Stack>
    </Paper>
  );
};

/**
 * Calendário de lançamentos da home: o que ainda vai ao ar na semana, numa
 * faixa horizontal agrupada por dia.
 *
 * Fica acima dos episódios recentes de propósito — quem acompanha uma série em
 * exibição abre o site pelo próximo episódio, não pelo catálogo.
 *
 * O cabeçalho de cada dia gruda na borda esquerda enquanto o grupo passa: a
 * data mora nele, e sem isso os cards do meio de um dia cheio ficariam só com o
 * horário, sem dizer de que dia ele é.
 */
const UpcomingSchedule = ({
  episodes,
  loading,
}: {
  episodes: UpcomingEpisodeProps[];
  loading: boolean;
}) => {
  const theme = useTheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // O agrupamento depende do relógio (o rótulo "Hoje") e da lista, não do tick.
  const days = useMemo(() => groupUpcomingByDay(episodes), [episodes]);

  // Sem agenda a seção some inteira: um "nada por aqui" só ocuparia a dobra.
  if (!loading && !days.length) return null;

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
        Próximos Episódios
      </Typography>

      <Stack
        className="faixa-rolavel"
        direction="row"
        gap={3}
        sx={{
          // A faixa rola sozinha; sem isto o excesso empurraria a página toda.
          // A barra é a nativa, a mesma da página — ver globals.css.
          overflowX: "auto",
          pb: 1,
        }}
      >
        {loading &&
          SKELETON_PLACEHOLDERS.map((_, index) => (
            <Box key={index} sx={{ flexShrink: 0, width: CARD_WIDTH }}>
              <Skeleton variant="text" sx={{ width: "50%" }} />
              <Skeleton
                variant="rounded"
                sx={{ width: "100%", height: 92, mt: 1 }}
              />
            </Box>
          ))}

        {!loading &&
          days.map((day) => (
            <Stack key={day.key} gap={1.25} sx={{ flexShrink: 0 }}>
              <Stack
                direction="row"
                alignItems="baseline"
                gap={1}
                sx={{
                  position: "sticky",
                  left: 0,
                  alignSelf: "flex-start",
                  // O cabeçalho passa por cima dos cards do grupo anterior
                  // enquanto está grudado, então precisa de fundo próprio.
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  backgroundColor: "background.paper",
                }}
              >
                <Typography
                  variant="overline"
                  fontWeight={700}
                  color="primary.main"
                  lineHeight={1.6}
                >
                  {day.label}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {day.episodes.length}{" "}
                  {day.episodes.length === 1 ? "episódio" : "episódios"}
                </Typography>
              </Stack>

              <Stack direction="row" gap={1.5}>
                {day.episodes.map((episode) => (
                  <UpcomingCard key={episode.id} episode={episode} now={now} />
                ))}
              </Stack>
            </Stack>
          ))}
      </Stack>
    </Box>
  );
};

export default UpcomingSchedule;
