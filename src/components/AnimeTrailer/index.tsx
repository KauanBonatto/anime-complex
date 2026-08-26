"use client";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Box, Typography } from "@mui/material";
import { useState } from "react";

/**
 * O player só entra na página depois do clique. Carregar o embed do YouTube de
 * saída custa mais de um megabyte em quem abriu a ficha só para ver a sinopse,
 * então mostramos a capa do vídeo e trocamos pelo iframe sob demanda.
 */
const withAutoplay = (url: string) =>
  `${url}${url.includes("?") ? "&" : "?"}autoplay=1`;

const FRAME_STYLE = {
  position: "relative" as const,
  width: "100%",
  maxWidth: 640,
  aspectRatio: "16 / 9",
  borderRadius: 2,
  overflow: "hidden",
  backgroundColor: "#000",
};

const AnimeTrailer = ({ trailer }: { trailer: AnimeTrailerProps }) => {
  const [playing, setPlaying] = useState(false);

  return (
    <Box mb={3}>
      <Typography variant="caption" color="text.disabled" display="block" mb={1}>
        Trailer
      </Typography>

      {playing ? (
        <Box sx={FRAME_STYLE}>
          <iframe
            allowFullScreen
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            title={`Trailer no ${trailer.siteLabel}`}
            src={withAutoplay(trailer.embedUrl)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        </Box>
      ) : (
        <Box
          role="button"
          tabIndex={0}
          aria-label={`Reproduzir trailer no ${trailer.siteLabel}`}
          onClick={() => setPlaying(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") setPlaying(true);
          }}
          sx={{
            ...FRAME_STYLE,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "&:hover .trailer-play, &:focus-visible .trailer-play": {
              transform: "scale(1.1)",
            },
          }}
        >
          {!!trailer.thumbnail && (
            <Box
              component="img"
              src={trailer.thumbnail}
              alt=""
              loading="lazy"
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.75,
              }}
            />
          )}

          <Box
            className="trailer-play"
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "primary.main",
              color: "primary.contrastText",
              transition: "transform 150ms ease",
            }}
          >
            <PlayArrowIcon fontSize="large" />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AnimeTrailer;
