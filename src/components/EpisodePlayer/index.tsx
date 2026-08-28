import CrunchyrollChip from "@/components/CrunchyrollChip";
import HlsVideo from "@/components/HlsVideo";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

/**
 * O player era fixo em 900x506 no meio da página. Agora ele preenche a coluna
 * em que estiver — que em telas grandes é mais larga que isso — e mantém o
 * formato pela proporção, sem altura fixa.
 */
const PLAYER_STYLE = {
  display: "block",
  width: "100%",
  height: "auto",
  aspectRatio: "16 / 9",
  maxHeight: "calc(100vh - 160px)",
  border: "none",
  borderRadius: 8,
  backgroundColor: "#000",
};

/**
 * Alguns providers injetam anúncios que chamam `top.location` e arrastam a aba
 * inteira para o site deles depois de alguns segundos. Sem `allow-top-navigation`
 * o embed fica preso dentro do iframe e o player continua funcionando normalmente.
 */
const PLAYER_SANDBOX = [
  "allow-scripts",
  "allow-same-origin",
  "allow-presentation",
].join(" ");

const PLAYER_PERMISSIONS =
  "autoplay; fullscreen; encrypted-media; picture-in-picture";

/**
 * O mesmo provider pode devolver mais de um link para o episódio, então as
 * repetições ganham um número para o usuário conseguir diferenciar as opções.
 * A contagem é por nome, e não por provider, porque players que já vêm com nome
 * próprio ("Top Animes (Filemoon)") se distinguem sozinhos.
 */
const buildOptions = (providers: EpisodeProviderProps[]) => {
  const used: Record<string, number> = {};

  return providers.map((provider) => {
    const position = (used[provider.name] = (used[provider.name] ?? 0) + 1);
    const repeated =
      providers.filter(({ name }) => name === provider.name).length > 1;

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
  crunchyroll,
}: {
  providers: EpisodeProviderProps[];
  /** Ausente quando só há players que abrem em aba nova. */
  selectedProvider: EpisodeProviderProps | null;
  onSelectProvider: (provider: EpisodeProviderProps) => void;
  /** Link oficial da Crunchyroll, quando o anime está no catálogo dela. */
  crunchyroll?: CrunchyrollLinkProps | null;
}) => {
  const [playerFailed, setPlayerFailed] = useState(false);

  useEffect(() => setPlayerFailed(false), [selectedProvider?.url]);

  const options = useMemo(() => buildOptions(providers), [providers]);
  // A Crunchyroll não toca aqui dentro, mas conta como opção de onde assistir.
  const hasChoice = options.length + (crunchyroll ? 1 : 0) > 1;

  return (
    <Box width="100%">
      {!selectedProvider ? (
        <Typography color="text.secondary" py={4}>
          Os players deste episódio só abrem em uma aba nova.
        </Typography>
      ) : selectedProvider.isHls ? (
        <HlsVideo
          key={selectedProvider.url}
          src={selectedProvider.url}
          style={PLAYER_STYLE}
          onError={() => setPlayerFailed(true)}
        />
      ) : selectedProvider.isEmbed ? (
        <iframe
          key={selectedProvider.url}
          allowFullScreen
          sandbox={PLAYER_SANDBOX}
          allow={PLAYER_PERMISSIONS}
          referrerPolicy="origin-when-cross-origin"
          title={`Player do ${selectedProvider.name}`}
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

      {/*
       * O `SANDBOX_REFUSERS` só conhece os hosts que já pegamos falhando, e
       * quem entrar nessa lista amanhã vai travar dentro do quadro sem dizer
       * nada — o iframe não avisa quando o conteúdo dele se recusa a rodar.
       * Esta saída serve para qualquer embed: assistir no domínio de origem,
       * onde não há sandbox, sem afrouxar a trava para todos os outros.
       */}
      {selectedProvider?.isEmbed && (
        <Box mt={1}>
          <Button
            size="small"
            href={selectedProvider.url}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon fontSize="small" />}
            sx={{ color: "text.disabled" }}
          >
            Não carregou? Abra em uma aba nova
          </Button>
        </Box>
      )}

      {playerFailed && selectedProvider && (
        <Typography variant="body2" color="error" mt={1}>
          O {selectedProvider.name} recusou a reprodução deste link.
          {hasChoice && " Tente outra opção na lista abaixo."}
        </Typography>
      )}

      <Stack alignItems="flex-start" gap={1.5} mt={3}>
        <Typography variant="subtitle2" color="text.disabled">
          {hasChoice && " Escolha por onde assistir"}
        </Typography>

        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1}
          aria-label="Players disponíveis"
        >
          {options.map((option) => {
            /**
             * Player que se recusa a rodar sob `sandbox` não vira iframe: abrir
             * numa aba nova o tira do nosso domínio, onde ele funciona, sem
             * precisar afrouxar a trava dos outros embeds.
             */
            if (option.isExternal) {
              return (
                <Tooltip
                  key={option.url}
                  title="Este player só funciona fora do site; abre em uma aba nova"
                >
                  <Button
                    variant="outlined"
                    color="secondary"
                    href={option.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNewIcon />}
                  >
                    {option.label}
                  </Button>
                </Tooltip>
              );
            }

            const isPlaying = option.url === selectedProvider?.url;

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

          {crunchyroll && <CrunchyrollChip link={crunchyroll} />}
        </Stack>
      </Stack>
    </Box>
  );
};

export default EpisodePlayer;
