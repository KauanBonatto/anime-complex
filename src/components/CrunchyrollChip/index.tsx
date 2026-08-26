import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Button, Tooltip } from "@mui/material";

/** Laranja da marca, para o link se distinguir dos players do próprio site. */
const CRUNCHYROLL_ORANGE = "#f47521";

/**
 * Leva ao episódio na Crunchyroll, em uma aba nova. O `rel` é obrigatório com
 * `target="_blank"`: sem ele a página aberta ganha acesso a esta pela
 * `window.opener`.
 */
const CrunchyrollChip = ({
  link,
  episodeNumber,
}: {
  link: CrunchyrollLinkProps;
  episodeNumber: number;
}) => (
  <Tooltip
    title={
      link.isEpisode
        ? `Assistir o episódio na Crunchyroll`
        : "Abrir anime na Crunchyroll"
    }
  >
    <Button
      variant="outlined"
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      endIcon={<OpenInNewIcon />}
      sx={{
        color: CRUNCHYROLL_ORANGE,
        borderColor: CRUNCHYROLL_ORANGE,
        ":hover": {
          color: "common.white",
          backgroundColor: CRUNCHYROLL_ORANGE,
          borderColor: CRUNCHYROLL_ORANGE,
        },
      }}
    >
      Crunchyroll
    </Button>
  </Tooltip>
);

export default CrunchyrollChip;
