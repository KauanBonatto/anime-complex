"use client";

import MangaDexService from "@/services/MangaDexService";
import type { ChapterDownloadFormat } from "@/utils/chapterDownload";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

interface ChapterDownloadButtonProps {
  series: string;
  chapter: MangaChapterProps;
  version: MangaChapterVersionProps;
  language: MangaLanguage;
  /** Botão com texto (barra do leitor) ou só o ícone (lista de capítulos). */
  variant?: "icon" | "button";
}

type Status =
  | { kind: "idle" }
  | { kind: "downloading"; done: number; total: number }
  | { kind: "building" }
  | { kind: "error" };

const FORMATS: { format: ChapterDownloadFormat; label: string; hint: string }[] = [
  { format: "pdf", label: "PDF", hint: "Abre em qualquer dispositivo" },
  { format: "cbz", label: "CBZ", hint: "Para apps leitores de mangá" },
];

/**
 * Baixa o capítulo em PDF ou CBZ. As páginas são pedidas na hora — o endereço
 * delas vence em minutos, então não dá para guardar da lista — e o arquivo é
 * montado aqui mesmo, no browser.
 */
const ChapterDownloadButton = ({
  series,
  chapter,
  version,
  language,
  variant = "icon",
}: ChapterDownloadButtonProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // Sair da tela no meio do download não deixa trabalho rodando por trás.
  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = status.kind === "downloading" || status.kind === "building";

  const start = async (format: ChapterDownloadFormat) => {
    setAnchor(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "downloading", done: 0, total: version.pages });

    try {
      const [{ downloadChapter }, pages] = await Promise.all([
        import("@/utils/chapterDownload"),
        MangaDexService.getChapterPages(version.id),
      ]);
      if (!pages?.pages.length) throw new Error("Capítulo sem páginas");

      await downloadChapter(
        { series, chapter, version, language, pages: pages.pages },
        format,
        {
          signal: controller.signal,
          onProgress: (done, total) =>
            setStatus(
              done === total
                ? { kind: "building" }
                : { kind: "downloading", done, total }
            ),
        }
      );
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus(controller.signal.aborted ? { kind: "idle" } : { kind: "error" });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const cancel = () => abortRef.current?.abort();

  const progress =
    status.kind === "downloading" && status.total
      ? (status.done / status.total) * 100
      : undefined;

  const tooltip =
    status.kind === "downloading"
      ? `Baixando ${status.done}/${status.total} — clique para cancelar`
      : status.kind === "building"
        ? "Montando o arquivo…"
        : status.kind === "error"
          ? "O download falhou. Clique para tentar de novo"
          : "Baixar capítulo";

  const onClick = (event: React.MouseEvent<HTMLElement>) => {
    if (status.kind === "downloading") return cancel();
    if (status.kind === "building") return;
    setAnchor(event.currentTarget);
  };

  const indicator = busy ? (
    <Box position="relative" display="inline-flex">
      <CircularProgress
        size={22}
        variant={progress === undefined ? "indeterminate" : "determinate"}
        value={progress}
      />
      {status.kind === "downloading" && (
        <CloseIcon
          sx={{ position: "absolute", inset: 0, m: "auto", fontSize: 14 }}
        />
      )}
    </Box>
  ) : status.kind === "error" ? (
    <ErrorOutlineIcon color="error" />
  ) : (
    <DownloadIcon />
  );

  return (
    <>
      <Tooltip title={tooltip}>
        {variant === "icon" ? (
          <IconButton size="small" onClick={onClick} aria-label={tooltip}>
            {indicator}
          </IconButton>
        ) : (
          <Button
            size="small"
            variant="outlined"
            onClick={onClick}
            startIcon={indicator}
          >
            {status.kind === "downloading"
              ? `${status.done}/${status.total}`
              : status.kind === "building"
                ? "Montando…"
                : "Baixar"}
          </Button>
        )}
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {FORMATS.map(({ format, label, hint }) => (
          <MenuItem key={format} onClick={() => start(format)}>
            <ListItemText primary={label} secondary={hint} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ChapterDownloadButton;
