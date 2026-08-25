import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

const PLAYER_STYLE = {
  maxWidth: "100%",
  maxHeight: "calc(100vh - 100px)",
  width: 900,
  height: 506,
  border: "none",
  borderRadius: 8,
  backgroundColor: "#000",
};

const EpisodePlayer = ({
  providers,
  selectedProvider,
  onSelectProvider,
}: {
  providers: EpisodeProviderProps[];
  selectedProvider: EpisodeProviderProps;
  onSelectProvider: (provider: EpisodeProviderProps) => void;
}) => {
  const [playerFailed, setPlayerFailed] = useState(false);

  useEffect(() => setPlayerFailed(false), [selectedProvider.url]);

  return (
    <Box width="100%" textAlign="center">
      {selectedProvider.isEmbed ? (
        <iframe
          key={selectedProvider.url}
          allowFullScreen
          style={PLAYER_STYLE}
          src={selectedProvider.url}
        />
      ) : (
        <video
          key={selectedProvider.url}
          controls
          autoPlay
          style={PLAYER_STYLE}
          src={selectedProvider.url}
          onError={() => setPlayerFailed(true)}
        />
      )}

      {playerFailed && (
        <Typography variant="body2" color="error" mt={1}>
          O {selectedProvider.name} recusou a reprodução deste link. Tente outro
          player abaixo.
        </Typography>
      )}

      <Stack
        direction="row"
        flexWrap="wrap"
        justifyContent="center"
        gap={1}
        mt={2}
      >
        <Typography variant="body2" color="text.disabled" mr={1}>
          Player:
        </Typography>
        {providers.map((provider) => (
          <Chip
            key={provider.slug}
            size="small"
            color="primary"
            label={provider.name}
            icon={provider.hasAds ? <WarningAmberIcon /> : undefined}
            title={
              provider.hasAds
                ? `${provider.name} — pode exibir anúncios`
                : provider.name
            }
            variant={
              provider.slug === selectedProvider.slug ? "filled" : "outlined"
            }
            onClick={() => onSelectProvider(provider)}
          />
        ))}
      </Stack>
    </Box>
  );
};

export default EpisodePlayer;
