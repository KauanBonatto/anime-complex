import CrunchyrollChip from "@/components/CrunchyrollChip";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

const PLAYER_STYLE = {
  maxWidth: "100%",
  maxHeight: "calc(100vh - 100px)",
  width: 900,
  height: 506,
  border: "none",
  borderRadius: 8,
  backgroundColor: "#000",
};

/**
 * O mesmo provider pode devolver mais de um link para o episódio, então as
 * repetições ganham um número para o usuário conseguir diferenciar as opções.
 */
const buildOptions = (providers: EpisodeProviderProps[]) => {
  const used: Record<string, number> = {};

  return providers.map((provider) => {
    const position = (used[provider.slug] = (used[provider.slug] ?? 0) + 1);
    const repeated =
      providers.filter(({ slug }) => slug === provider.slug).length > 1;

    return {
      ...provider,
      label: repeated ? `${provider.name} (${position})` : provider.name,
    };
  });
};

const EpisodePlayer = ({
  providers,
  selectedProvider,
  onSelectProvider,
  episodeNumber,
  crunchyroll,
}: {
  providers: EpisodeProviderProps[];
  selectedProvider: EpisodeProviderProps;
  onSelectProvider: (provider: EpisodeProviderProps) => void;
  episodeNumber: number;
  /** Link oficial da Crunchyroll, quando o anime está no catálogo dela. */
  crunchyroll?: CrunchyrollLinkProps | null;
}) => {
  const [playerFailed, setPlayerFailed] = useState(false);

  useEffect(() => setPlayerFailed(false), [selectedProvider.url]);

  const options = useMemo(() => buildOptions(providers), [providers]);
  // A Crunchyroll não toca aqui dentro, mas conta como opção de onde assistir.
  const hasChoice = options.length + (crunchyroll ? 1 : 0) > 1;

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
          O {selectedProvider.name} recusou a reprodução deste link.
          {hasChoice && " Tente outra opção na lista abaixo."}
        </Typography>
      )}

      <Stack alignItems="center" gap={1.5} mt={3}>
        <Typography variant="subtitle2" color="text.disabled">
          {hasChoice && " Escolha por onde assistir"}
        </Typography>

        <Stack
          direction="row"
          flexWrap="wrap"
          justifyContent="center"
          gap={1}
          aria-label="Players disponíveis"
        >
          {options.map((option) => {
            const isPlaying = option.url === selectedProvider.url;

            return (
              <Button
                key={option.url}
                aria-pressed={isPlaying}
                variant={isPlaying ? "contained" : "outlined"}
                disableElevation
                startIcon={
                  isPlaying ? <PlayArrowIcon /> : <PlayCircleOutlineIcon />
                }
                endIcon={
                  option.hasAds ? (
                    <Tooltip title="Pode exibir anúncios">
                      <WarningAmberIcon fontSize="small" />
                    </Tooltip>
                  ) : undefined
                }
                onClick={() => onSelectProvider(option)}
              >
                {option.label}
              </Button>
            );
          })}

          {crunchyroll && (
            <CrunchyrollChip link={crunchyroll} episodeNumber={episodeNumber} />
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default EpisodePlayer;
