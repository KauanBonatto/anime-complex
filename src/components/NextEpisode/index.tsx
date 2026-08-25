import { airingDateLabel, timeUntilLabel } from "@/utils/anime";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

/** A contagem só muda de minuto em minuto, então não precisa de tick de 1s. */
const TICK_INTERVAL = 60 * 1000;

const NextEpisode = ({
  nextEpisode,
  status,
}: {
  nextEpisode: NextEpisodeProps;
  status?: string | null;
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const secondsLeft = nextEpisode.airingAt - Math.floor(now / 1000);
  const isPremiere = status === "NOT_YET_RELEASED" || nextEpisode.number === 1;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1.5,
        mb: 3,
        maxWidth: "100%",
      }}
    >
      <ScheduleIcon color="primary" />

      <Box>
        <Typography variant="caption" color="text.disabled" display="block">
          {isPremiere ? "Estreia" : "Próximo episódio"}
        </Typography>
        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
          <Typography variant="body2" fontWeight={500}>
            {isPremiere
              ? airingDateLabel(nextEpisode.airingAt)
              : `Episódio ${nextEpisode.number} · ${airingDateLabel(
                  nextEpisode.airingAt
                )}`}
          </Typography>
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={
              secondsLeft > 0
                ? `em ${timeUntilLabel(secondsLeft)}`
                : timeUntilLabel(secondsLeft)
            }
          />
        </Stack>
      </Box>
    </Box>
  );
};

export default NextEpisode;
