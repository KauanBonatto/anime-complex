"use client";

import { AnimeScoreBadge } from "@/components/AnimeScore";
import EpisodeThumb from "@/components/EpisodeThumb";
import { useInView } from "@/hooks/useInView";
import TmdbService from "@/services/TmdbService";
import { airedDateLabel, timeAgoLabel } from "@/utils/anime";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, Paper, Stack, Typography, alpha } from "@mui/material";
import { useEffect, useState } from "react";

/**
 * Card de "Episódios Recentes". Mostra o episódio, e não a obra: a imagem é a
 * do próprio episódio, com o número, há quanto tempo saiu e a data de
 * exibição — e o clique leva direto ao player.
 *
 * A imagem vem do TMDB. A grade de exibição do AniList não devolve
 * `streamingEpisodes`, e mesmo consultando a obra diretamente ele não cobre
 * episódios recém-exibidos: numa amostra da lista exibida aqui, o AniList
 * tinha a imagem de nenhum dos vinte e quatro, e o TMDB de sete em cada oito.
 *
 * A busca é adiada até o card entrar na tela, porque esta seção fica abaixo da
 * dobra e são dezenas de obras. Enquanto não chega — e quando não existe — o
 * degradê com o número segura o lugar, o mesmo da lista de episódios da ficha.
 */
const ReleaseCard = ({ anime }: { anime: AnimeProps }) => {
  const { ref, visivel } = useInView<HTMLDivElement>();
  const [thumb, setThumb] = useState<string | null>(null);

  const numero = anime.episodeNumber;

  useEffect(() => {
    if (!visivel || !numero) return;

    let ativo = true;
    TmdbService.getEpisode(anime, numero)
      .then((episodio) => {
        if (ativo && episodio?.thumbnail) setThumb(episodio.thumbnail);
      })
      .catch(() => {
        // A imagem é um extra; o degradê com o número já identifica o card.
      });

    return () => {
      ativo = false;
    };
  }, [anime, numero, visivel]);

  return (
    <Paper
      ref={ref}
      elevation={0}
      sx={{
        display: "block",
        width: "100%",
        height: "100%",
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        transition: ".2s",
        ":hover": {
          borderColor: "primary.main",
          ".episode-thumb": { transform: "scale(1.05)" },
          ".episode-play": { opacity: 1 },
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <EpisodeThumb
          src={thumb}
          alt={`${anime.title} — episódio ${numero ?? ""}`.trim()}
          fallbackLabel={numero ? `EP ${numero}` : anime.title}
          sizes="(max-width: 600px) 92vw, (max-width: 900px) 46vw, 320px"
        />

        <Box
          className="episode-play"
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            transition: ".2s",
            backgroundColor: "rgba(14, 0, 15, 0.45)",
          }}
        >
          <PlayArrowRoundedIcon sx={{ fontSize: "3rem", color: "#fff" }} />
        </Box>

        <AnimeScoreBadge score={anime.score} />

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            position: "absolute",
            insetInline: 0,
            bottom: 0,
            px: 1,
            py: 0.75,
            background:
              "linear-gradient(180deg, transparent 0%, rgba(14,0,15,0.88) 100%)",
            pointerEvents: "none",
          }}
        >
          {!!numero && (
            <Typography variant="caption" fontWeight={700} sx={{ color: "#fff" }}>
              EP {numero}
            </Typography>
          )}
          {!!anime.airedAt && (
            <Typography variant="caption" sx={{ color: "#fff", opacity: 0.85 }}>
              {timeAgoLabel(anime.airedAt)}
            </Typography>
          )}
        </Stack>
      </Box>

      <Stack sx={{ px: 1.25, py: 1.25, gap: 0.25 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          title={anime.title}
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {anime.title}
        </Typography>
        {!!anime.airedAt && (
          <Typography variant="caption" color="text.disabled">
            {airedDateLabel(anime.airedAt)}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default ReleaseCard;
