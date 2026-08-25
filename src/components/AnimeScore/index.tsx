import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { Box, Rating, Tooltip, Typography } from "@mui/material";

/** Faixas de cor para leitura rápida da nota (0 a 10). */
export const scoreColor = (score: number) => {
  if (score >= 8) return "#2e9e5b";
  if (score >= 6.5) return "#e0a01e";
  if (score >= 5) return "#d97706";
  return "#c0392b";
};

export const formatScore = (score: number) => score.toFixed(1).replace(".", ",");

/** Selo compacto exibido sobre a capa do anime. */
export const AnimeScoreBadge = ({ score }: { score?: number | null }) => {
  if (!score) return null;

  return (
    <Tooltip title={`Avaliação da comunidade: ${formatScore(score)} de 10`}>
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          backgroundColor: "rgba(14, 0, 15, 0.78)",
          backdropFilter: "blur(2px)",
        }}
      >
        <StarRoundedIcon sx={{ fontSize: "1rem", color: scoreColor(score) }} />
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{ color: "#fff", lineHeight: 1 }}
        >
          {formatScore(score)}
        </Typography>
      </Box>
    </Tooltip>
  );
};

/** Avaliação em estrelas com o valor numérico, usada na ficha do anime. */
export const AnimeScoreRating = ({
  score,
  favourites,
}: {
  score?: number | null;
  favourites?: number | null;
}) => {
  if (!score) {
    return (
      <Typography variant="body2" color="text.disabled">
        Ainda sem avaliação
      </Typography>
    );
  }

  return (
    <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
      <Rating
        readOnly
        precision={0.1}
        value={score / 2}
        sx={{ color: scoreColor(score) }}
      />
      <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1 }}>
        {formatScore(score)}
        <Typography component="span" variant="body2" color="text.disabled">
          {" "}
          / 10
        </Typography>
      </Typography>
      {!!favourites && (
        <Typography variant="body2" color="text.disabled">
          · {favourites.toLocaleString("pt-BR")} favoritos
        </Typography>
      )}
    </Box>
  );
};
