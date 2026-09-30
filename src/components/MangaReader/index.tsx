"use client";

import type { ReaderFit, ReaderMode } from "@/utils/readingProgress";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface MangaReaderProps {
  pages: string[];
  mode: ReaderMode;
  fit: ReaderFit;
  /** Página (base zero) em que o capítulo abre. */
  initialPage: number;
  /**
   * Muda a cada vez que a lista de páginas é pedida de novo: as páginas que
   * falharam voltam a tentar, agora com o endereço novo.
   */
  attempt: number;
  /** Altura ocupada pelo que fica fixo acima do leitor (navbar + barra). */
  topOffset: number;
  onPageChange: (page: number) => void;
  onImageLoad: (page: number) => void;
  /** Uma página não carregou — normalmente o servidor do @Home venceu. */
  onImageError: (page: number) => void;
  /** O que aparece depois da última página: o atalho para o próximo capítulo. */
  end: ReactNode;
  /** Avançar além do fim, no modo página a página. */
  onEnd?: () => void;
}

/** Até a imagem chegar, a página reserva uma altura parecida com a de verdade. */
const PLACEHOLDER_HEIGHT = "70vh";

/** Quantas páginas à frente o modo página a página já deixa baixadas. */
const PRELOAD_AHEAD = 2;

/** Largura máxima da página no ajuste por largura: além disso vira pôster. */
const MAX_PAGE_WIDTH = 900;

/**
 * Leitor de capítulo: rolagem contínua (o jeito de ler no celular e em
 * webtoons) ou página a página, com clique nas laterais e setas do teclado.
 */
const MangaReader = (props: MangaReaderProps) =>
  props.mode === "vertical" ? <VerticalReader {...props} /> : <PagedReader {...props} />;

/** Uma página, com o espaço reservado e o aviso de erro. */
const PageImage = ({
  src,
  index,
  total,
  fit,
  mode,
  topOffset,
  eager,
  failed,
  onLoad,
  onError,
  onRetry,
}: {
  src: string;
  index: number;
  total: number;
  fit: ReaderFit;
  mode: ReaderMode;
  topOffset: number;
  eager: boolean;
  failed: boolean;
  onLoad: () => void;
  onError: () => void;
  onRetry: () => void;
}) => {
  const [loaded, setLoaded] = useState(false);

  // Altura útil da janela, descontado o que fica fixo em cima.
  const viewport = `calc(100vh - ${topOffset}px)`;

  if (failed) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        gap={2}
        sx={{ width: "100%", maxWidth: MAX_PAGE_WIDTH, height: "50vh", mx: "auto" }}
      >
        <Typography variant="body2" color="text.secondary">
          Não foi possível carregar a página {index + 1}.
        </Typography>
        <Button size="small" variant="outlined" onClick={onRetry}>
          Tentar de novo
        </Button>
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        minHeight: loaded ? undefined : mode === "paged" ? viewport : PLACEHOLDER_HEIGHT,
      }}
    >
      {!loaded && (
        <CircularProgress
          size={28}
          sx={{ position: "absolute", top: "calc(50% - 14px)", left: "calc(50% - 14px)" }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- O servidor do
          MangaDex@Home muda a cada capítulo, e passar as páginas pelo otimizador
          do Next dobraria o tráfego sem ganho: já vêm no tamanho final. */}
      <img
        src={src}
        alt={`Página ${index + 1} de ${total}`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={() => {
          setLoaded(true);
          onLoad();
        }}
        onError={onError}
        style={{
          display: "block",
          userSelect: "none",
          ...(fit === "width"
            ? { width: "100%", maxWidth: MAX_PAGE_WIDTH, height: "auto" }
            : { maxWidth: "100%", maxHeight: viewport, width: "auto", height: "auto" }),
        }}
      />
    </Box>
  );
};

/**
 * Guarda quais páginas falharam. Uma nova lista de páginas (`attempt`) zera
 * tudo, porque os endereços mudaram.
 */
const useFailedPages = (attempt: number) => {
  const [failed, setFailed] = useState<Set<number>>(new Set());
  useEffect(() => setFailed(new Set()), [attempt]);

  const markFailed = useCallback(
    (index: number) =>
      setFailed((current) => (current.has(index) ? current : new Set(current).add(index))),
    []
  );
  return { failed, markFailed };
};

const VerticalReader = ({
  pages,
  fit,
  initialPage,
  attempt,
  topOffset,
  onPageChange,
  onImageLoad,
  onImageError,
  end,
}: MangaReaderProps) => {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const { failed, markFailed } = useFailedPages(attempt);

  // Abre na página em que a pessoa parou.
  useEffect(() => {
    if (initialPage > 0) {
      refs.current[initialPage]?.scrollIntoView({ block: "start" });
    }
    // Só na abertura do capítulo: depois quem manda é a rolagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A página atual é a que cruza o meio da tela.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (!visible) return;
        const index = refs.current.indexOf(visible.target as HTMLDivElement);
        if (index >= 0) onPageChange(index);
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );
    refs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, [pages, onPageChange]);

  return (
    <Box>
      {pages.map((src, index) => (
        <Box
          key={`${index}-${src}`}
          ref={(element: HTMLDivElement | null) => {
            refs.current[index] = element;
          }}
          // Sem espaço entre as páginas: é assim que webtoons são lidos.
          sx={{ scrollMarginTop: topOffset }}
        >
          <PageImage
            src={src}
            index={index}
            total={pages.length}
            fit={fit}
            mode="vertical"
            topOffset={topOffset}
            eager={Math.abs(index - initialPage) <= 1}
            failed={failed.has(index)}
            onLoad={() => onImageLoad(index)}
            onError={() => {
              markFailed(index);
              onImageError(index);
            }}
            onRetry={() => onImageError(index)}
          />
        </Box>
      ))}
      <Box mt={4}>{end}</Box>
    </Box>
  );
};

const PagedReader = ({
  pages,
  fit,
  initialPage,
  attempt,
  topOffset,
  onPageChange,
  onImageLoad,
  onImageError,
  end,
  onEnd,
}: MangaReaderProps) => {
  // `pages.length` é o cartão de fim de capítulo.
  const [page, setPage] = useState(() => Math.min(initialPage, pages.length - 1));
  const { failed, markFailed } = useFailedPages(attempt);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const go = useCallback(
    (step: 1 | -1) => {
      if (step === 1 && page >= pages.length) return onEnd?.();
      setPage((current) => Math.max(0, Math.min(pages.length, current + step)));
    },
    [page, pages.length, onEnd]
  );

  const firstRender = useRef(true);
  useEffect(() => {
    if (page < pages.length) onPageChange(page);
    // Troca de página leva o topo dela para a tela, como virar a folha. Na
    // abertura não: o título do capítulo continua à vista.
    if (firstRender.current) firstRender.current = false;
    else containerRef.current?.scrollIntoView({ block: "start" });
  }, [page, pages.length, onPageChange]);

  // Deixa as próximas páginas no cache do navegador antes do clique.
  useEffect(() => {
    pages.slice(page + 1, page + 1 + PRELOAD_AHEAD).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, [page, pages]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (page >= pages.length) {
    return (
      <Box ref={containerRef} sx={{ scrollMarginTop: topOffset }}>
        {end}
        <Stack alignItems="center" mt={2}>
          <Button size="small" onClick={() => go(-1)}>
            Voltar para a última página
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{ position: "relative", scrollMarginTop: topOffset, cursor: "pointer" }}
      // Clique no terço esquerdo volta; no resto, avança.
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        const { left, width } = event.currentTarget.getBoundingClientRect();
        go(event.clientX - left < width / 3 ? -1 : 1);
      }}
    >
      <PageImage
        key={`${page}-${pages[page]}`}
        src={pages[page]}
        index={page}
        total={pages.length}
        fit={fit}
        mode="paged"
        topOffset={topOffset}
        eager
        failed={failed.has(page)}
        onLoad={() => onImageLoad(page)}
        onError={() => {
          markFailed(page);
          onImageError(page);
        }}
        onRetry={() => onImageError(page)}
      />
    </Box>
  );
};

export default MangaReader;
