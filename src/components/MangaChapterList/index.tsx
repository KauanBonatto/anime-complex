"use client";

import ChapterDownloadButton from "@/components/ChapterDownloadButton";
import MangaDexService from "@/services/MangaDexService";
import { translucent } from "@/theme/translucent";
import {
  MANGA_LANGUAGE_LABELS,
  chapterHref,
  chapterLabel,
  isChapterReadable,
  preferredLanguage,
  readableVersion,
} from "@/utils/manga";
import { ReadingProgress, getReadingProgress } from "@/utils/readingProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Altura aproximada de uma linha, para o `content-visibility` reservar lugar. */
const CHAPTER_ROW_HEIGHT = 56;

type FeedState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; feed: MangaChapterFeedProps | null };

interface VolumeGroup {
  key: string;
  label: string;
  chapters: MangaChapterProps[];
}

/**
 * Agrupa por volume na ordem em que os volumes aparecem. Os capítulos sem
 * volume costumam ser os mais novos, ainda não compilados, e caem no fim.
 */
const groupByVolume = (chapters: MangaChapterProps[]): VolumeGroup[] => {
  const groups = new Map<string, VolumeGroup>();
  for (const chapter of chapters) {
    const key = chapter.volume ?? "none";
    const group = groups.get(key) ?? {
      key,
      label: chapter.volume ? `Volume ${chapter.volume}` : "Sem volume",
      chapters: [],
    };
    group.chapters.push(chapter);
    groups.set(key, group);
  }

  const list = Array.from(groups.values());
  const none = list.findIndex((group) => group.key === "none");
  if (none >= 0) list.push(...list.splice(none, 1));
  return list;
};

/**
 * Capítulos do mangá, vindos do MangaDex. Fica abaixo da ficha e carrega por
 * conta própria: a ficha não espera por ela.
 */
const MangaChapterList = ({ manga }: { manga: MangaDetailsProps }) => {
  const [state, setState] = useState<FeedState>({ kind: "loading" });
  const [language, setLanguage] = useState<MangaLanguage>("pt-br");
  const [newestFirst, setNewestFirst] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<ReadingProgress | null>(null);

  const load = useCallback(() => {
    setState({ kind: "loading" });
    MangaDexService.getChapterFeed(manga)
      .then((feed) => {
        setState({ kind: "ready", feed });
        // O progresso decide o idioma antes da preferência: quem estava lendo
        // em inglês volta para o inglês.
        const saved = getReadingProgress(manga.id);
        setProgress(saved);
        if (feed) {
          setLanguage(
            saved && feed.chapters[saved.language]?.length
              ? saved.language
              : preferredLanguage(feed)
          );
        }
      })
      .catch(() => setState({ kind: "error" }));
    // Só o ID muda a obra: a tradução da sinopse troca o objeto da ficha, e
    // isso não pode recarregar a lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manga.id]);

  useEffect(load, [load]);

  const feed = state.kind === "ready" ? state.feed : null;
  const chapters = useMemo(() => feed?.chapters[language] ?? [], [feed, language]);
  const groups = useMemo(() => {
    const list = groupByVolume(chapters);
    if (!newestFirst) return list;
    return list
      .reverse()
      .map((group) => ({ ...group, chapters: [...group.chapters].reverse() }));
  }, [chapters, newestFirst]);

  // Abre o volume de onde a pessoa parou, ou o primeiro da lista.
  useEffect(() => {
    if (!groups.length) return;
    const current = groups.find((group) =>
      group.chapters.some((chapter) =>
        chapter.versions.some((version) => version.id === progress?.versionId)
      )
    );
    setExpanded(new Set([(current ?? groups[0]).key]));
    // Só ao trocar de idioma ou de obra; reordenar não fecha o que está aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, progress]);

  const firstReadable = chapters.find(isChapterReadable);
  const continueChapter =
    progress?.language === language &&
    chapters.some((chapter) =>
      chapter.versions.some((version) => version.id === progress.versionId)
    )
      ? progress
      : null;

  const toggleGroup = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Box component="section" mt={6}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        gap={2}
        mb={2}
      >
        <Typography variant="h4" fontWeight={500}>
          Capítulos
        </Typography>

        {feed && (
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={language}
              onChange={(_, value: MangaLanguage | null) => value && setLanguage(value)}
              aria-label="Idioma dos capítulos"
            >
              {(Object.keys(MANGA_LANGUAGE_LABELS) as MangaLanguage[]).map((lang) => (
                <ToggleButton
                  key={lang}
                  value={lang}
                  disabled={!feed.chapters[lang].length}
                  sx={{ px: 1.5, textTransform: "none" }}
                >
                  {MANGA_LANGUAGE_LABELS[lang]} ({feed.chapters[lang].length})
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Tooltip title={newestFirst ? "Mais antigos primeiro" : "Mais recentes primeiro"}>
              <IconButton
                size="small"
                onClick={() => setNewestFirst((value) => !value)}
                aria-label="Inverter a ordem"
              >
                <SwapVertIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>

      {state.kind === "loading" && (
        <Stack gap={1}>
          <Skeleton variant="rounded" width={180} height={36} />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={CHAPTER_ROW_HEIGHT - 8} />
          ))}
        </Stack>
      )}

      {state.kind === "error" && (
        <Stack direction="row" alignItems="center" gap={2}>
          <Typography variant="body2" color="text.secondary">
            Não foi possível carregar os capítulos agora.
          </Typography>
          <Button size="small" onClick={load}>
            Tentar de novo
          </Button>
        </Stack>
      )}

      {state.kind === "ready" && !feed && (
        <Typography variant="body2" color="text.secondary">
          Esta obra não está disponível no MangaDex, de onde vêm os capítulos.
        </Typography>
      )}

      {feed && !chapters.length && (
        <Typography variant="body2" color="text.secondary">
          Nenhum capítulo em português ou inglês no MangaDex.{" "}
          <Link href={`https://mangadex.org/title/${feed.mangadexId}`} target="_blank" rel="noopener noreferrer">
            Ver a obra no MangaDex
          </Link>
        </Typography>
      )}

      {feed && !!chapters.length && (
        <>
          <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
            {continueChapter ? (
              <Button
                variant="contained"
                startIcon={<MenuBookIcon />}
                component={Link}
                href={chapterHref(manga.id, continueChapter.versionId)}
              >
                Continuar {chapterLabel(continueChapter).toLowerCase()}
              </Button>
            ) : (
              firstReadable && (
                <Button
                  variant="contained"
                  startIcon={<MenuBookIcon />}
                  component={Link}
                  href={chapterHref(manga.id, readableVersion(firstReadable)!.id)}
                >
                  Começar a ler
                </Button>
              )
            )}
            {!firstReadable && (
              <Typography variant="body2" color="text.secondary">
                Esta obra é licenciada: os capítulos só abrem no site oficial.
              </Typography>
            )}
          </Stack>

          <Box
            sx={{
              borderRadius: 2,
              border: (theme) =>
                `1px solid ${translucent(theme.vars.palette.primary.mainChannel, 0.15)}`,
              p: 1,
            }}
          >
            {groups.length === 1 ? (
              <ChapterRows
                manga={manga}
                language={language}
                chapters={groups[0].chapters}
                currentVersionId={progress?.versionId}
              />
            ) : (
              groups.map((group) => (
                <Accordion
                  key={group.key}
                  expanded={expanded.has(group.key)}
                  onChange={() => toggleGroup(group.key)}
                  disableGutters
                  elevation={0}
                  // Obras longas têm centenas de capítulos por grupo fechado;
                  // montar só o que está aberto mantém a ficha leve.
                  TransitionProps={{ unmountOnExit: true }}
                  sx={{ backgroundColor: "transparent", "::before": { display: "none" } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {group.label}
                      <Typography component="span" variant="caption" color="text.disabled">
                        {" "}
                        ({group.chapters.length} caps)
                      </Typography>
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <ChapterRows
                      manga={manga}
                      language={language}
                      chapters={group.chapters}
                      currentVersionId={progress?.versionId}
                    />
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>

          <Typography variant="caption" color="text.disabled" display="block" mt={1}>
            Capítulos via MangaDex, traduzidos pelos grupos indicados em cada um.
          </Typography>
        </>
      )}
    </Box>
  );
};

const ChapterRows = ({
  manga,
  language,
  chapters,
  currentVersionId,
}: {
  manga: MangaDetailsProps;
  language: MangaLanguage;
  chapters: MangaChapterProps[];
  currentVersionId?: string;
}) => (
  <Stack gap={0.5}>
    {chapters.map((chapter) => {
      const version = readableVersion(chapter);
      const external = chapter.versions.find((item) => item.externalUrl);
      const isCurrent = chapter.versions.some((item) => item.id === currentVersionId);
      const shown = version ?? external ?? chapter.versions[0];

      const details = (
        <Box minWidth={0} flexGrow={1}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {chapterLabel(chapter)}
            {chapter.title && (
              <Typography component="span" variant="body2" color="text.secondary">
                {" "}
                — {chapter.title}
              </Typography>
            )}
          </Typography>
          <Typography variant="caption" color="text.disabled" noWrap display="block">
            {[
              shown.group,
              version ? `${version.pages} págs` : null,
              chapter.versions.length > 1 ? `${chapter.versions.length} traduções` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Grupo não informado"}
          </Typography>
        </Box>
      );

      return (
        <Stack
          key={`${chapter.number}-${shown.id}`}
          direction="row"
          alignItems="center"
          gap={1}
          sx={{
            contentVisibility: "auto",
            containIntrinsicSize: `auto ${CHAPTER_ROW_HEIGHT}px`,
            borderRadius: 1.5,
            pr: 1,
            backgroundColor: (theme) =>
              isCurrent ? translucent(theme.vars.palette.primary.mainChannel, 0.1) : "transparent",
            ":hover": {
              backgroundColor: (theme) => translucent(theme.vars.palette.primary.mainChannel, 0.06),
            },
          }}
        >
          {version ? (
            <Box
              component={Link}
              href={chapterHref(manga.id, version.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexGrow: 1,
                minWidth: 0,
                px: 1,
                py: 1,
                color: "inherit",
                textDecoration: "none",
              }}
            >
              {details}
              {isCurrent && <Chip size="small" color="primary" label="Lendo" />}
            </Box>
          ) : (
            <Box display="flex" alignItems="center" flexGrow={1} minWidth={0} px={1} py={1}>
              {details}
            </Box>
          )}

          {version ? (
            <ChapterDownloadButton
              series={manga.title}
              chapter={chapter}
              version={version}
              language={language}
            />
          ) : (
            external?.externalUrl && (
              <Button
                size="small"
                endIcon={<OpenInNewIcon />}
                href={external.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ flexShrink: 0 }}
              >
                Site oficial
              </Button>
            )
          )}
        </Stack>
      );
    })}
  </Stack>
);

export default MangaChapterList;
