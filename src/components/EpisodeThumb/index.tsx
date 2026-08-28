"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Hosts liberados no next.config e, portanto, elegíveis ao next/image. Os
 * thumbnails que vêm do AniList são servidos por hosts variados da Crunchyroll,
 * que mudam sem aviso — liberar todos eles no `remotePatterns` seria abrir a
 * otimização de imagem para domínios de terceiros, então esses caem para <img>
 * puro, como o AnimeTrailer já faz com a capa do YouTube.
 */
const OPTIMIZED_HOSTS = ["https://image.tmdb.org/", "https://s4.anilist.co/"];

const isOptimized = (src: string) =>
  OPTIMIZED_HOSTS.some((host) => src.startsWith(host));

interface EpisodeThumbProps {
  src?: string | null;
  alt: string;
  /** Exibido no lugar da imagem quando não há thumb: o número do episódio. */
  fallbackLabel: string;
  sizes: string;
  compact?: boolean;
}

/**
 * Imagem 16:9 de um episódio. A cobertura é irregular por natureza — o TMDB
 * ilustra o catálogo antigo, o AniList os lançamentos, e sobram episódios sem
 * nenhuma imagem —, então o degradê com o número é um estado normal, e não um
 * erro a ser escondido.
 */
const EpisodeThumb = ({
  src,
  alt,
  fallbackLabel,
  sizes,
  compact = false,
}: EpisodeThumbProps) => {
  // Os endereços da Crunchyroll expiram e voltam 404; sem isto o card ficaria
  // com o ícone de imagem quebrada no lugar do degradê.
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [src]);

  const imagem = falhou ? null : src;

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        overflow: "hidden",
        backgroundColor: "primary.main",
        backgroundImage: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.dark} 100%)`,
      }}
    >
      {imagem ? (
        isOptimized(imagem) ? (
          <Image
            className="episode-thumb"
            src={imagem}
            alt={alt}
            fill
            sizes={sizes}
            draggable={false}
            onError={() => setFalhou(true)}
            style={{ objectFit: "cover", transition: ".3s" }}
          />
        ) : (
          <Box
            component="img"
            className="episode-thumb"
            src={imagem}
            alt={alt}
            loading="lazy"
            draggable={false}
            onError={() => setFalhou(true)}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: ".3s",
            }}
          />
        )
      ) : (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            fontWeight={700}
            color="common.white"
            sx={{
              opacity: 0.55,
              lineHeight: 1,
              fontSize: compact ? "1rem" : { xs: "1.75rem", sm: "2.25rem" },
            }}
          >
            {fallbackLabel}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default EpisodeThumb;
