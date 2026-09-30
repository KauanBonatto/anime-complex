"use client";

import ChapterDownloadButton from "@/components/ChapterDownloadButton";
import MangaReader from "@/components/MangaReader";
import PageShell, { NAVBAR_HEIGHT } from "@/components/PageShell";
import { ReaderSkeleton } from "@/components/Skeletons";
import MangaDexService from "@/services/MangaDexService";
import MangaService from "@/services/MangaService";
import { translucent } from "@/theme/translucent";
import {
  MANGA_LANGUAGE_LABELS,
  chapterHref,
  chapterLabel,
  isChapterReadable,
  locateChapter,
  neighbourChapter,
  readableVersion,
} from "@/utils/manga";
import {
  DEFAULT_READER_PREFS,
  ReaderPrefs,
  getReaderPrefs,
  getReadingProgress,
  saveReaderPrefs,
  saveReadingProgress,
} from "@/utils/readingProgress";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import DataSaverOffIcon from "@mui/icons-material/DataSaverOff";
import DataSaverOnIcon from "@mui/icons-material/DataSaverOn";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import HeightIcon from "@mui/icons-material/Height";
import ViewDayOutlinedIcon from "@mui/icons-material/ViewDayOutlined";
import WidthFullIcon from "@mui/icons-material/WidthFull";
import {
  Box,
  Button,
  IconButton,
  NativeSelect,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Várias páginas falham juntas quando o servidor do @Home vence; um pedido de
 * lista nova resolve todas, e os outros erros dessa leva são ignorados.
 */
const REFRESH_COOLDOWN = 3_000;

/** Rolar menos que isso não mexe na barra: evita piscar com o trackpad. */
const SCROLL_THRESHOLD = 12;

type PagesState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "missing" }
  | { kind: "ready"; pages: MangaChapterPagesProps };

const MangaReaderView = ({
  params,
}: {
  params: { manga_id: string; chapter_id: string };
}) => {
  const router = useRouter();
  const mangaId = params.manga_id;
  const chapterId = params.chapter_id;

  const [invalid, setInvalid] = useState(!UUID.test(chapterId));
  const [manga, setManga] = useState<MangaDetailsProps | null>(null);
  const [feed, setFeed] = useState<MangaChapterFeedProps | null>(null);
  const [pagesState, setPagesState] = useState<PagesState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_READER_PREFS);
  const [startPage, setStartPage] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [barHidden, setBarHidden] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const loadedPages = useRef<Set<number>>(new Set());
  const lastRefresh = useRef(0);

  useEffect(() => setPrefs(getReaderPrefs()), []);

  const updatePrefs = (change: Partial<ReaderPrefs>) => {
    const next = { ...prefs, ...change };
    // Trocar o modo ou a qualidade remonta o leitor: ele reabre na página em
    // que estava.
    if (next.mode !== prefs.mode || next.dataSaver !== prefs.dataSaver) {
      setStartPage(currentPage);
    }
    // As páginas carregadas eram da outra qualidade.
    if (next.dataSaver !== prefs.dataSaver) loadedPages.current = new Set();
    setPrefs(next);
    saveReaderPrefs(next);
  };

  const loadPages = useCallback(
    (isCurrent: () => boolean = () => true) => {
      setPagesState({ kind: "loading" });
      setAttempt(0);
      loadedPages.current = new Set();

      MangaDexService.getChapterPages(chapterId)
        .then((pages) => {
          if (isCurrent()) setPagesState(pages ? { kind: "ready", pages } : { kind: "missing" });
        })
        .catch(() => isCurrent() && setPagesState({ kind: "error" }));
    },
    [chapterId]
  );

  // A ficha, os capítulos e as páginas. As páginas não dependem da ficha e
  // saem em paralelo: é o que a pessoa está esperando para começar.
  useEffect(() => {
    if (!UUID.test(chapterId)) {
      setInvalid(true);
      return;
    }
    let alive = true;
    // Vindo da ficha ou do capítulo anterior, a página chegaria rolada até o
    // meio. O leitor começa do título; retomar a página salva é com ele.
    window.scrollTo(0, 0);
    const saved = getReadingProgress(mangaId);
    const start = saved?.versionId === chapterId ? saved.page : 0;
    setStartPage(start);
    setCurrentPage(start);
    loadPages(() => alive);

    MangaService.getMangaDetails(mangaId).then((details) => {
      if (!alive) return;
      if (!details) return setInvalid(true);
      setManga(details);
      MangaDexService.getChapterFeed(details)
        .then((result) => alive && setFeed(result))
        .catch(() => alive && setFeed(null));
    });

    return () => {
      alive = false;
    };
  }, [mangaId, chapterId, loadPages]);

  const located = useMemo(
    () => (feed ? locateChapter(feed, chapterId) : null),
    [feed, chapterId]
  );
  const previous = located ? neighbourChapter(located.chapters, located.index, -1) : null;
  const next = located ? neighbourChapter(located.chapters, located.index, 1) : null;

  const goTo = useCallback(
    (chapter: MangaChapterProps | null) => {
      const version = chapter && readableVersion(chapter);
      if (version) router.push(chapterHref(mangaId, version.id));
    },
    [router, mangaId]
  );

  const pages =
    pagesState.kind === "ready"
      ? prefs.dataSaver
        ? pagesState.pages.pagesDataSaver
        : pagesState.pages.pages
      : [];

  // Guarda onde a pessoa parou, para a ficha oferecer "Continuar".
  useEffect(() => {
    if (pagesState.kind !== "ready") return;
    saveReadingProgress(mangaId, {
      versionId: chapterId,
      number: located?.chapter.number ?? null,
      language: located?.language ?? "pt-br",
      page: currentPage,
    });
  }, [mangaId, chapterId, located, currentPage, pagesState.kind]);

  // Perto do fim, a lista de páginas do próximo capítulo já fica pronta.
  useEffect(() => {
    const version = next && readableVersion(next);
    if (version && pages.length && currentPage >= pages.length - 3) {
      MangaDexService.getChapterPages(version.id).catch(() => undefined);
    }
  }, [next, currentPage, pages.length]);

  /**
   * Pede uma lista nova de páginas. As que já apareceram na tela mantêm o
   * endereço antigo — trocar remontaria a imagem e a rolagem pularia —, e só
   * as que ainda não carregaram passam para o servidor novo.
   */
  const refreshPages = useCallback(() => {
    if (Date.now() - lastRefresh.current < REFRESH_COOLDOWN) return;
    lastRefresh.current = Date.now();

    MangaDexService.getChapterPages(chapterId, { fresh: true })
      .then((fresh) => {
        if (!fresh) return;
        setPagesState((current) => {
          if (current.kind !== "ready") return { kind: "ready", pages: fresh };
          const keep = (old: string[], updated: string[]) =>
            updated.map((url, index) =>
              loadedPages.current.has(index) && old[index] ? old[index] : url
            );
          return {
            kind: "ready",
            pages: {
              pages: keep(current.pages.pages, fresh.pages),
              pagesDataSaver: keep(current.pages.pagesDataSaver, fresh.pagesDataSaver),
            },
          };
        });
        setAttempt((value) => value + 1);
      })
      .catch(() => undefined);
  }, [chapterId]);

  // A barra some ao rolar para baixo e volta ao rolar para cima. Escuta em
  // captura para pegar também a rolagem do contêiner em tela cheia.
  useEffect(() => {
    let last = 0;
    const onScroll = (event: Event) => {
      const target = event.target;
      const top =
        target instanceof HTMLElement ? target.scrollTop : window.scrollY;
      const delta = top - last;
      if (Math.abs(delta) < SCROLL_THRESHOLD) return;
      setBarHidden(delta > 0 && top > 200);
      last = top;
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setBarHeight(bar.offsetHeight));
    observer.observe(bar);
    return () => observer.disconnect();
  }, [pagesState.kind, manga]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else containerRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  const onPageChange = useCallback((page: number) => setCurrentPage(page), []);

  if (invalid) notFound();

  const stickyTop = fullscreen ? 0 : NAVBAR_HEIGHT;
  const readableChapters = located
    ? located.chapters
        .map((chapter, index) => ({ chapter, index }))
        .filter(({ chapter }) => isChapterReadable(chapter))
    : [];
  const alternatives = located
    ? located.chapter.versions.filter((version) => !version.externalUrl && version.pages > 0)
    : [];
  const group = located?.version.group;

  const endCard = (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 900,
        mx: "auto",
        p: 3,
        borderRadius: 2,
        textAlign: "center",
        border: (theme) => `1px solid ${translucent(theme.vars.palette.primary.mainChannel, 0.15)}`,
      }}
    >
      {next ? (
        <>
          <Typography variant="overline" color="text.secondary">
            Fim do {located ? chapterLabel(located.chapter).toLowerCase() : "capítulo"}
          </Typography>
          <Typography variant="h6" mb={2}>
            Próximo: {chapterLabel(next)}
            {next.title ? ` — ${next.title}` : ""}
          </Typography>
          <Button variant="contained" endIcon={<ArrowForwardIosIcon />} onClick={() => goTo(next)}>
            Ler o próximo
          </Button>
        </>
      ) : (
        <>
          <Typography variant="h6" mb={1}>
            Você chegou ao último capítulo disponível
          </Typography>
          <Button component={Link} href={`/manga/${mangaId}`} variant="outlined">
            Voltar para a obra
          </Button>
        </>
      )}
      <Typography variant="caption" color="text.disabled" display="block" mt={3}>
        {group ? `Tradução de ${group} · ` : ""}Páginas via{" "}
        <a
          href={`https://mangadex.org/chapter/${chapterId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit" }}
        >
          MangaDex
        </a>
      </Typography>
    </Paper>
  );

  return (
    <PageShell loading={pagesState.kind === "loading"}>
      <Box
        ref={containerRef}
        sx={{
          ...(fullscreen && {
            overflowY: "auto",
            bgcolor: "background.default",
            px: { xs: 1, md: 3 },
          }),
        }}
      >
        <Box sx={{ maxWidth: 900, mx: "auto", mb: 2 }}>
          <Typography
            component={Link}
            href={`/manga/${mangaId}`}
            variant="body2"
            color="text.secondary"
            sx={{ textDecoration: "none", ":hover": { textDecoration: "underline" } }}
          >
            ← {manga?.title ?? "Voltar para a obra"}
          </Typography>
          <Typography variant="h5" fontWeight={500} mt={0.5}>
            {located ? chapterLabel(located.chapter) : "Capítulo"}
            {located?.chapter.title && (
              <Typography component="span" variant="h5" color="text.secondary">
                {" "}
                — {located.chapter.title}
              </Typography>
            )}
          </Typography>
          {located && (
            <Typography variant="caption" color="text.disabled">
              {[
                located.chapter.volume ? `Volume ${located.chapter.volume}` : null,
                MANGA_LANGUAGE_LABELS[located.language],
                group ? `Tradução: ${group}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          )}
        </Box>

        <Paper
          ref={barRef}
          elevation={0}
          sx={{
            position: "sticky",
            top: stickyTop,
            // Abaixo da navbar, para escorregar por baixo dela ao esconder.
            zIndex: (theme) => theme.zIndex.appBar - 1,
            maxWidth: 900,
            mx: "auto",
            mb: 3,
            px: 1,
            py: 0.75,
            borderRadius: 2,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
            bgcolor: "background.paper",
            border: (theme) => `1px solid ${translucent(theme.vars.palette.primary.mainChannel, 0.15)}`,
            transform: barHidden ? `translateY(calc(-100% - ${stickyTop + 8}px))` : "none",
            transition: "transform 200ms ease",
          }}
        >
          <Tooltip title="Capítulo anterior">
            <span>
              <IconButton size="small" disabled={!previous} onClick={() => goTo(previous)}>
                <ArrowBackIosNewIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {located && (
            <NativeSelect
              value={located.index}
              onChange={(event) => goTo(located.chapters[Number(event.target.value)])}
              inputProps={{ "aria-label": "Capítulo" }}
              sx={{ flex: "1 1 140px", minWidth: 0, fontSize: 14 }}
            >
              {readableChapters.map(({ chapter, index }) => (
                <option key={index} value={index}>
                  {chapterLabel(chapter)}
                  {chapter.title ? ` — ${chapter.title}` : ""}
                </option>
              ))}
            </NativeSelect>
          )}

          <Tooltip title="Próximo capítulo">
            <span>
              <IconButton size="small" disabled={!next} onClick={() => goTo(next)}>
                <ArrowForwardIosIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {alternatives.length > 1 && (
            <NativeSelect
              value={chapterId}
              onChange={(event) => router.push(chapterHref(mangaId, event.target.value))}
              inputProps={{ "aria-label": "Tradução" }}
              sx={{ flex: "0 1 160px", minWidth: 0, fontSize: 14 }}
            >
              {alternatives.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.group ?? "Grupo não informado"}
                </option>
              ))}
            </NativeSelect>
          )}

          <Box flexGrow={1} />

          {!!pages.length && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, whiteSpace: "nowrap" }}>
              {Math.min(currentPage + 1, pages.length)} / {pages.length}
            </Typography>
          )}

          <Tooltip title={prefs.mode === "vertical" ? "Página a página" : "Rolagem contínua"}>
            <IconButton
              size="small"
              onClick={() => updatePrefs({ mode: prefs.mode === "vertical" ? "paged" : "vertical" })}
            >
              {prefs.mode === "vertical" ? <AutoStoriesOutlinedIcon /> : <ViewDayOutlinedIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={prefs.fit === "width" ? "Ajustar à altura da tela" : "Ajustar à largura"}>
            <IconButton
              size="small"
              onClick={() => updatePrefs({ fit: prefs.fit === "width" ? "height" : "width" })}
            >
              {prefs.fit === "width" ? <HeightIcon /> : <WidthFullIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip
            title={prefs.dataSaver ? "Economia de dados ligada" : "Economia de dados desligada"}
          >
            <IconButton
              size="small"
              color={prefs.dataSaver ? "primary" : "default"}
              onClick={() => updatePrefs({ dataSaver: !prefs.dataSaver })}
            >
              {prefs.dataSaver ? <DataSaverOnIcon /> : <DataSaverOffIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}>
            <IconButton size="small" onClick={toggleFullscreen}>
              {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>

          {located && manga && (
            <ChapterDownloadButton
              variant="button"
              series={manga.title}
              chapter={located.chapter}
              version={located.version}
              language={located.language}
            />
          )}
        </Paper>

        {pagesState.kind === "loading" && <ReaderSkeleton />}

        {pagesState.kind === "error" && (
          <Stack alignItems="center" gap={2} py={8}>
            <Typography color="text.secondary">
              Não foi possível carregar as páginas agora.
            </Typography>
            <Button variant="outlined" onClick={() => loadPages()}>
              Tentar de novo
            </Button>
          </Stack>
        )}

        {pagesState.kind === "missing" && (
          <Stack alignItems="center" gap={2} py={8}>
            <Typography color="text.secondary">
              Este capítulo não está disponível para leitura.
            </Typography>
            <Button component={Link} href={`/manga/${mangaId}`} variant="outlined">
              Voltar para a obra
            </Button>
          </Stack>
        )}

        {pagesState.kind === "ready" && (
          <MangaReader
            // Trocar de modo, de capítulo ou de qualidade recomeça o leitor na
            // página em que a pessoa estava.
            key={`${chapterId}-${prefs.mode}-${prefs.dataSaver}`}
            pages={pages}
            mode={prefs.mode}
            fit={prefs.fit}
            initialPage={startPage}
            attempt={attempt}
            topOffset={stickyTop + barHeight + 16}
            onPageChange={onPageChange}
            onImageLoad={(index) => loadedPages.current.add(index)}
            onImageError={refreshPages}
            end={endCard}
            onEnd={next ? () => goTo(next) : undefined}
          />
        )}
      </Box>
    </PageShell>
  );
};

export default MangaReaderView;
