import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Button, Tooltip } from "@mui/material";

/**
 * Leva ao episódio na Crunchyroll, em uma aba nova. O `rel` é obrigatório com
 * `target="_blank"`: sem ele a página aberta ganha acesso a esta pela
 * `window.opener`.
 */
const CrunchyrollChip = ({ link }: { link: CrunchyrollLinkProps }) => (
  <Tooltip
    title={
      link.isEpisode
        ? "Assistir o episódio na Crunchyroll"
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
        color: "brand.crunchyroll",
        borderColor: "brand.crunchyroll",
        ":hover": {
          color: "common.white",
          backgroundColor: "brand.crunchyroll",
          borderColor: "brand.crunchyroll",
        },
      }}
    >
      Crunchyroll
    </Button>
  </Tooltip>
);

export default CrunchyrollChip;
