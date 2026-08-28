"use client";

import { formatScore, scoreColor } from "@/components/AnimeScore";
import AnilistService from "@/services/AnilistService";
import TmdbService from "@/services/TmdbService";
import { genreLabel } from "@/utils/anime";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { Box, Button, Chip, Skeleton, Stack, Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const HERO_HEIGHT = { xs: 260, sm: 300, md: 340 };

/**
 * Destaque do topo da home. A página abria direto no filtro de gêneros, sem
 * nenhum ponto focal — aqui o anime mais popular do momento vira a capa.
 *
 * Os dados básicos vêm da lista que a home já carregou; só o banner e a
 * sinopse exigem a ficha completa, que é buscada à parte e cai num degradê
 * liso enquanto não chega.
 */
const HomeHero = ({ anime }: { anime?: AnimeProps }) => {
  const [details, setDetails] = useState<AnimeDetailsProps | null>(null);

  useEffect(() => {
    if (!anime?.id) return;

    let active = true;
    setDetails(null);

    AnilistService.getAnimeDetails(anime.id)
      // A sinopse do AniList vem em inglês; o resto do site já mostra a versão
      // em pt-BR do TMDB, e o destaque não pode ser a exceção.
      .then((data) => (data ? TmdbService.localize(data) : null))
      .then((data) => {
        // A home troca de destaque quando os filtros mudam; sem isso uma
        // resposta atrasada sobrescreveria o anime já exibido.
        if (active) setDetails(data);
      })
      .catch(() => {
        // O destaque é enfeite: sem ele a home segue inteira.
      });

    return () => {
      active = false;
    };
  }, [anime?.id]);

  if (!anime) {
    return (
      <Skeleton
        variant="rounded"
        sx={{ width: "100%", height: HERO_HEIGHT, mb: { xs: 3, md: 5 } }}
      />
    );
  }

  const banner = details?.bannerImage;
  const genres = (anime.genres ?? []).slice(0, 3);

  return (
    <Box
      sx={{
        position: "relative",
        height: HERO_HEIGHT,
        mb: { xs: 3, md: 5 },
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: "primary.main",
      }}
    >
      {banner && (
        <Image
          priority
          fill
          src={banner}
          alt=""
          aria-hidden
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      )}

      {/* O texto fica sobre a imagem, então precisa de um véu que garanta o
          contraste em qualquer banner — inclusive nos bem claros. */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: (theme) => `linear-gradient(90deg,
            ${theme.palette.primary.main} 0%,
            ${theme.palette.primary.main}d9 45%,
            ${theme.palette.primary.main}40 100%)`,
        }}
      />

      <Stack
        spacing={1.5}
        sx={{
          position: "relative",
          height: "100%",
          justifyContent: "center",
          alignItems: "flex-start",
          px: { xs: 2.5, sm: 4, md: 5 },
          py: 3,
          maxWidth: { xs: "100%", md: "62%" },
        }}
      >
        <Typography
          variant="h4"
          fontWeight={600}
          color="common.white"
          sx={{
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.4rem" },
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {anime.title}
        </Typography>

        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
          {/* O AnimeScoreRating usa a cor escura do tema, que sumiria sobre o
              roxo do banner — aqui a nota vai em branco. */}
          {!!anime.score && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <StarRoundedIcon
                sx={{ fontSize: "1.25rem", color: scoreColor(anime.score) }}
              />
              <Typography variant="body2" fontWeight={700} color="common.white">
                {formatScore(anime.score)}
                <Typography
                  component="span"
                  variant="caption"
                  color="common.white"
                  sx={{ opacity: 0.7 }}
                >
                  {" "}
                  / 10
                </Typography>
              </Typography>
            </Stack>
          )}
          {genres.map((genre) => (
            <Chip
              key={genre}
              size="small"
              label={genreLabel(genre)}
              sx={{
                color: "common.white",
                borderColor: "common.white",
                backgroundColor: "transparent",
                border: "1px solid",
              }}
            />
          ))}
        </Stack>

        {details === null ? (
          <Skeleton
            variant="text"
            sx={{ width: { xs: "90%", md: 520 }, bgcolor: "rgba(255,255,255,.2)" }}
          />
        ) : (
          !!details.description && (
            <Typography
              variant="body2"
              color="common.white"
              sx={{
                display: { xs: "none", sm: "-webkit-box" },
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                opacity: 0.85,
              }}
            >
              {details.description}
            </Typography>
          )
        )}

        <Button
          component={Link}
          href={`/anime/${anime.id}`}
          variant="contained"
          color="secondary"
          startIcon={<PlayArrowIcon />}
          sx={{
            mt: 0.5,
            backgroundColor: "common.white",
            color: "primary.main",
            fontWeight: 600,
            ":hover": { backgroundColor: "grey.200" },
          }}
        >
          Ver detalhes
        </Button>
      </Stack>
    </Box>
  );
};

export default HomeHero;
