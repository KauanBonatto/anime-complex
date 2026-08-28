"use client";

import { GENRE_LABELS } from "@/utils/anime";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import { useState } from "react";

const GENRES = Object.entries(GENRE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface FilterBarProps {
  filters: string[];
  setFilters: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * Filtro de gêneros. Ficava sempre aberto, com os dezessete gêneros ocupando o
 * topo de cada página antes de qualquer conteúdo — agora a barra mostra só o
 * que está ativo e o painel inteiro fica a um clique.
 */
const FilterBar = ({ filters, setFilters }: FilterBarProps) => {
  // Já abre expandido quando não há escolha nenhuma: é o momento em que a
  // lista de gêneros serve para alguma coisa.
  const [expanded, setExpanded] = useState(filters.length === 0);

  const toggleGenre = (value: string) => {
    setFilters((previous) =>
      previous.includes(value)
        ? previous.filter((genre) => genre !== value)
        : [...previous, value]
    );
  };

  const activeLabel = (value: string) => GENRE_LABELS[value] ?? value;

  return (
    <Box
      sx={{
        mb: { xs: 4, md: 6 },
        borderRadius: 2,
        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.03),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5 }}
      >
        <Button
          size="small"
          color="primary"
          startIcon={<TuneIcon />}
          endIcon={
            <ExpandMoreIcon
              sx={{
                transition: ".2s",
                transform: expanded ? "rotate(180deg)" : "none",
              }}
            />
          }
          onClick={() => setExpanded((previous) => !previous)}
          aria-expanded={expanded}
          sx={{ fontWeight: 500, flexShrink: 0 }}
        >
          Gêneros
        </Button>

        {/* Os ativos ficam visíveis mesmo com o painel fechado — sem isso não
            dá para saber por que a listagem abaixo está reduzida. */}
        {filters.map((value) => (
          <Chip
            key={value}
            size="small"
            color="primary"
            label={activeLabel(value)}
            onDelete={() => toggleGenre(value)}
          />
        ))}

        {!!filters.length && (
          <>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="caption" color="text.disabled">
              {filters.length} {filters.length === 1 ? "ativo" : "ativos"}
            </Typography>
            <Button size="small" color="primary" onClick={() => setFilters([])}>
              Limpar
            </Button>
          </>
        )}
      </Stack>

      <Collapse in={expanded} unmountOnExit>
        <Divider
          sx={{ borderColor: (theme) => alpha(theme.palette.primary.main, 0.15) }}
        />
        <Box
          display="flex"
          flexWrap="wrap"
          gap={1}
          sx={{ px: { xs: 1.5, sm: 2 }, py: 2 }}
        >
          {GENRES.map((genre) => {
            const selected = filters.includes(genre.value);

            return (
              <Chip
                key={genre.value}
                label={genre.label}
                color="primary"
                variant={selected ? "filled" : "outlined"}
                onClick={() => toggleGenre(genre.value)}
                sx={{
                  transition: ".2s",
                  border: (theme) =>
                    `1px solid ${theme.palette.primary.main}`,
                  ":hover": {
                    backgroundColor: (theme) =>
                      selected
                        ? theme.palette.primary.dark
                        : alpha(theme.palette.primary.main, 0.12),
                  },
                }}
              />
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
};

export default FilterBar;
