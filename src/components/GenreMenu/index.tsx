"use client";

import { NAVBAR_HEIGHT } from "@/components/PageShell/height";
import { useGenreFilters } from "@/contexts/GenreFilterContext";
import { translucent } from "@/theme/translucent";
import { GENRE_LABELS } from "@/utils/anime";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import {
  Badge,
  Box,
  Button,
  ButtonBase,
  Divider,
  IconButton,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";

const GENRES = Object.entries(GENRE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/** Largura do painel: três colunas de gênero sem quebrar rótulo longo. */
const PANEL_WIDTH = 520;

/**
 * Filtro de gêneros do cabeçalho. Ocupava o topo de cada listagem, empurrando
 * o conteúdo para baixo; agora é um painel que desce do header, como o menu de
 * categorias dos catálogos de streaming.
 *
 * O estado mora no GenreFilterProvider — o header é irmão das telas, não pai
 * delas, então o filtro não pode ser um `useState` local de nenhum dos dois.
 */
const GenreMenu = () => {
  const { filters, toggleGenre, clearFilters } = useGenreFilters();

  // Posição fixa em vez de âncora no botão: o painel encosta na borda de baixo
  // do header, e não no rodapé do botão, que fica no meio da barra. O header é
  // sticky no topo, então essa distância é sempre a altura dele.
  const [anchorPosition, setAnchorPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const open = !!anchorPosition;

  const openPanel = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorPosition({
      top: NAVBAR_HEIGHT,
      left: event.currentTarget.getBoundingClientRect().left,
    });

  const closePanel = () => setAnchorPosition(null);

  const triggerProps = {
    onClick: openPanel,
    "aria-haspopup": true,
    "aria-expanded": open,
    "aria-label": filters.length
      ? `Categorias, ${filters.length} ${filters.length === 1 ? "ativa" : "ativas"}`
      : "Categorias",
  } as const;

  return (
    <>
      {/* No celular a barra já disputa espaço com logo, seções e busca — lá o
          filtro vira só o ícone. */}
      <IconButton
        {...triggerProps}
        sx={{
          display: { xs: "inline-flex", md: "none" },
          color: "brand.chromeContrast",
          flexShrink: 0,
        }}
      >
        <Badge badgeContent={filters.length} color="error">
          <TuneIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Button
        {...triggerProps}
        size="small"
        color="inherit"
        startIcon={<TuneIcon fontSize="small" />}
        endIcon={
          <ExpandMoreIcon
            fontSize="small"
            sx={{
              transition: ".2s",
              transform: open ? "rotate(180deg)" : "none",
            }}
          />
        }
        sx={{
          display: { xs: "none", md: "inline-flex" },
          flexShrink: 0,
          borderRadius: 5,
          fontWeight: filters.length ? 600 : 400,
          paddingInline: 1.5,
          backgroundColor: (theme) =>
            open
              ? translucent(theme.vars.palette.brand.chromeContrastChannel, 0.12)
              : "transparent",
        }}
      >
        Categorias
        {!!filters.length && (
          <Box
            component="span"
            sx={{
              ml: 1,
              px: 0.75,
              borderRadius: 5,
              fontSize: "0.75rem",
              lineHeight: 1.6,
              color: "brand.chrome",
              backgroundColor: "brand.chromeContrast",
            }}
          >
            {filters.length}
          </Box>
        )}
      </Button>

      <Popover
        open={open}
        onClose={closePanel}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition ?? undefined}
        // Sem transição vertical: o painel cresce a partir da borda do header.
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: `calc(100vw - 32px)`, sm: PANEL_WIDTH },
              maxHeight: `calc(100vh - ${NAVBAR_HEIGHT}px - 24px)`,
              borderRadius: 2,
              color: "brand.chromeContrast",
              backgroundColor: (theme) =>
                translucent(theme.vars.palette.brand.chromeChannel, 0.97),
              backgroundImage: "none",
              backdropFilter: "blur(8px)",
              border: (theme) =>
                `1px solid ${translucent(
                  theme.vars.palette.brand.chromeContrastChannel,
                  0.12
                )}`,
            },
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, pt: 2, pb: 1 }}
        >
          <Typography
            variant="caption"
            sx={{ letterSpacing: 1, opacity: 0.7, textTransform: "uppercase" }}
          >
            Gêneros
          </Typography>

          {!!filters.length && (
            <Button
              size="small"
              color="inherit"
              onClick={clearFilters}
              sx={{ opacity: 0.8, ":hover": { opacity: 1 } }}
            >
              Limpar
            </Button>
          )}
        </Stack>

        <Divider
          sx={{
            borderColor: (theme) =>
              translucent(theme.vars.palette.brand.chromeContrastChannel, 0.12),
          }}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
            },
            gap: 0.5,
            px: 1.5,
            py: 2,
          }}
        >
          {GENRES.map((genre) => {
            const selected = filters.includes(genre.value);

            return (
              <ButtonBase
                key={genre.value}
                onClick={() => toggleGenre(genre.value)}
                aria-pressed={selected}
                sx={{
                  justifyContent: "flex-start",
                  gap: 0.75,
                  px: 1,
                  py: 1,
                  borderRadius: 1,
                  fontSize: "0.9375rem",
                  fontWeight: selected ? 600 : 400,
                  textAlign: "left",
                  opacity: selected ? 1 : 0.8,
                  transition: ".2s",
                  ":hover": {
                    opacity: 1,
                    backgroundColor: (theme) =>
                      translucent(
                        theme.vars.palette.brand.chromeContrastChannel,
                        0.12
                      ),
                  },
                }}
              >
                {/* O espaço do check fica reservado sempre: sem isso o rótulo
                    desliza para o lado a cada seleção. */}
                <CheckIcon
                  fontSize="small"
                  sx={{ visibility: selected ? "visible" : "hidden" }}
                />
                {genre.label}
              </ButtonBase>
            );
          })}
        </Box>
      </Popover>
    </>
  );
};

export default GenreMenu;
