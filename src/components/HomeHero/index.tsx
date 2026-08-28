"use client";

import { formatScore, scoreColor } from "@/components/AnimeScore";
import AnilistService from "@/services/AnilistService";
import TmdbService from "@/services/TmdbService";
import { genreLabel } from "@/utils/anime";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const HERO_HEIGHT = { xs: 320, sm: 380, md: 440 };

/** Tempo de cada obra em cena antes de o carrossel virar sozinho. */
const AUTOPLAY_MS = 7000;

/**
 * Destaque do topo da home. A página abria direto no filtro de gêneros, sem
 * nenhum ponto focal — aqui um punhado de obras se reveza na capa.
 *
 * Os dados básicos vêm das listas que a home já carregou; só o banner e a
 * sinopse exigem a ficha completa. Ela é buscada sob demanda, para a obra em
 * cena e a seguinte: carregar as seis de uma vez gastaria requisições de um
 * carrossel que a maioria não vai percorrer até o fim.
 */
const HomeHero = ({ animes }: { animes: AnimeProps[] }) => {
  const theme = useTheme();
  const reduzirMovimento = useMediaQuery("(prefers-reduced-motion: reduce)");

  const [index, setIndex] = useState(0);
  const [pausado, setPausado] = useState(false);
  /**
   * Ficha de cada obra por id. Ausente quer dizer "ainda buscando"; "vazio"
   * quer dizer que a busca terminou sem nada — sem essa distinção uma obra sem
   * ficha ficaria com o esqueleto da sinopse para sempre.
   */
  const [fichas, setFichas] = useState<Record<string, AnimeDetailsProps | "vazio">>(
    {}
  );

  /**
   * Quem já foi pedido. Fica num ref, e não no estado, porque marcar o pedido
   * não pode disparar uma nova renderização: o efeito que busca depende desta
   * marca e voltaria a rodar, cancelando a própria requisição que acabou de
   * disparar — foi o que manteve a sinopse invisível em todos os slides.
   */
  const pedidos = useRef<Set<string>>(new Set());

  const total = animes.length;

  // A lista pode encolher quando os filtros mudam; sem isto o índice ficaria
  // apontando para uma posição que não existe mais.
  useEffect(() => {
    setIndex(0);
  }, [total]);

  const irPara = useCallback(
    (proximo: number) => {
      if (!total) return;
      setIndex(((proximo % total) + total) % total);
    },
    [total]
  );

  // Um elenco novo (troca de filtros) reabre a temporada de pedidos.
  useEffect(() => {
    pedidos.current = new Set();
    setFichas({});
  }, [animes]);

  /** Busca a ficha da obra em cena e a da próxima, uma única vez cada. */
  useEffect(() => {
    if (!total) return;

    [animes[index], animes[(index + 1) % total]].forEach((anime) => {
      if (!anime || pedidos.current.has(anime.id)) return;
      pedidos.current.add(anime.id);

      AnilistService.getAnimeDetails(anime.id)
        // O TmdbService devolve a sinopse em pt-BR quando existe e mantém a do
        // AniList, em inglês, quando não existe — o destaque nunca fica sem
        // texto por falta de tradução.
        .then((data) => (data ? TmdbService.localize(data) : null))
        .then((data) =>
          setFichas((atual) => ({ ...atual, [anime.id]: data ?? "vazio" }))
        )
        .catch(() =>
          // O destaque é enfeite: sem ele a home segue inteira.
          setFichas((atual) => ({ ...atual, [anime.id]: "vazio" }))
        );
    });
  }, [animes, index, total]);

  /** Troca sozinho, menos quando o ponteiro está em cima ou há foco dentro. */
  useEffect(() => {
    if (total < 2 || pausado || reduzirMovimento) return;

    const timer = setInterval(() => irPara(index + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [index, irPara, pausado, reduzirMovimento, total]);

  if (!total) {
    return (
      <Skeleton
        variant="rounded"
        sx={{ width: "100%", height: HERO_HEIGHT, mb: { xs: 3, md: 5 } }}
      />
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        height: HERO_HEIGHT,
        mb: { xs: 3, md: 5 },
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: "primary.main",
      }}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      aria-roledescription="carrossel"
      aria-label="Obras em destaque"
    >
      {animes.map((anime, posicao) => (
        <Slide
          key={anime.id}
          anime={anime}
          detalhes={fichas[anime.id]}
          ativo={posicao === index}
          prioridade={posicao === 0}
        />
      ))}

      {total > 1 && (
        <>
          <Seta lado="left" aoClicar={() => irPara(index - 1)} rotulo="Anterior" />
          <Seta lado="right" aoClicar={() => irPara(index + 1)} rotulo="Próximo" />

          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 3,
            }}
          >
            {animes.map((anime, posicao) => (
              <Box
                key={anime.id}
                component="button"
                type="button"
                aria-label={`Ir para ${anime.title}`}
                aria-current={posicao === index}
                onClick={() => irPara(posicao)}
                sx={{
                  width: posicao === index ? 22 : 8,
                  height: 8,
                  p: 0,
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  transition: ".25s",
                  backgroundColor: (t) =>
                    posicao === index
                      ? t.palette.common.white
                      : alpha(t.palette.common.white, 0.45),
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
};

/** Uma obra em cena. Todas ficam montadas e só a ativa fica visível. */
const Slide = ({
  anime,
  detalhes,
  ativo,
  prioridade,
}: {
  anime: AnimeProps;
  detalhes: AnimeDetailsProps | "vazio" | undefined;
  ativo: boolean;
  prioridade: boolean;
}) => {
  const ficha = detalhes === "vazio" ? null : detalhes;
  const banner = ficha?.bannerImage ?? anime.bannerImage ?? null;
  const generos = (anime.genres ?? []).slice(0, 3);
  // Boa parte das obras em exibição ainda não tem arte deitada cadastrada no
  // AniList, e sem isto o slide delas virava um retângulo roxo vazio. A capa
  // entra desfocada no fundo e nítida como pôster, então todo slide tem imagem.
  const usaCapaDeFundo = !banner;

  return (
    <Box
      // `inert` não é confiável em todos os navegadores ainda, então o slide
      // fora de cena sai da navegação por teclado pelo próprio hidden.
      aria-hidden={!ativo}
      sx={{
        position: "absolute",
        inset: 0,
        opacity: ativo ? 1 : 0,
        transition: "opacity .5s ease",
        pointerEvents: ativo ? "auto" : "none",
        visibility: ativo ? "visible" : "hidden",
      }}
    >
      <Image
        fill
        src={banner ?? anime.image}
        alt=""
        aria-hidden
        sizes="100vw"
        priority={prioridade}
        style={{
          objectFit: "cover",
          ...(usaCapaDeFundo && {
            filter: "blur(24px)",
            // A capa é estreita: ampliá-la evita as bordas transparentes que o
            // desfoque deixa à mostra.
            transform: "scale(1.2)",
          }),
        }}
      />

      {/* O texto fica sobre a imagem, então precisa de um véu que garanta o
          contraste em qualquer banner — inclusive nos bem claros. */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: (theme) => `linear-gradient(90deg,
            ${theme.palette.primary.main} 0%,
            ${theme.palette.primary.main}d9 45%,
            ${theme.palette.primary.main}40 100%)`,
        }}
      />

      {/* Pôster nítido, a partir de md — no celular ele roubaria a largura do
          texto sem acrescentar informação. */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          right: 40,
          transform: "translateY(-50%)",
          width: 190,
          aspectRatio: "180 / 254",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: 6,
          display: { xs: "none", md: "block" },
        }}
      >
        <Image
          fill
          src={anime.image}
          alt=""
          aria-hidden
          sizes="190px"
          style={{ objectFit: "cover" }}
        />
      </Box>

      <Stack
        spacing={1.5}
        sx={{
          position: "relative",
          height: "100%",
          justifyContent: "center",
          alignItems: "flex-start",
          px: { xs: 2.5, sm: 4, md: 5 },
          py: 3,
          pb: { xs: 5, md: 6 },
          maxWidth: { xs: "100%", md: "58%" },
        }}
      >
        <Typography
          variant="h4"
          fontWeight={600}
          color="common.white"
          sx={{
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.4rem" },
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {anime.title}
        </Typography>

        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
          {/* O AnimeScoreRating usa a cor escura do tema, que sumiria sobre o
              roxo do banner — aqui a nota vai em branco. */}
          {!!anime.score && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <StarRoundedIcon
                sx={{ fontSize: "1.25rem", color: scoreColor(anime.score) }}
              />
              <Typography variant="body2" fontWeight={700} color="common.white">
                {formatScore(anime.score)}
                <Typography
                  component="span"
                  variant="caption"
                  color="common.white"
                  sx={{ opacity: 0.7 }}
                >
                  {" "}
                  / 10
                </Typography>
              </Typography>
            </Stack>
          )}
          {!!anime.episodeNumber && (
            <Chip
              size="small"
              label={`EP ${anime.episodeNumber} no ar`}
              sx={{
                color: "common.white",
                backgroundColor: (t) => alpha(t.palette.common.white, 0.2),
                fontWeight: 600,
              }}
            />
          )}
          {generos.map((genero) => (
            <Chip
              key={genero}
              size="small"
              label={genreLabel(genero)}
              sx={{
                color: "common.white",
                borderColor: "common.white",
                backgroundColor: "transparent",
                border: "1px solid",
              }}
            />
          ))}
        </Stack>

        {detalhes === undefined ? (
          <Skeleton
            variant="text"
            sx={{ width: { xs: "90%", md: 520 }, bgcolor: "rgba(255,255,255,.2)" }}
          />
        ) : (
          !!ficha?.description && (
            <Typography
              variant="body2"
              color="common.white"
              sx={{
                display: { xs: "none", sm: "-webkit-box" },
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                opacity: 0.85,
              }}
            >
              {ficha.description}
            </Typography>
          )
        )}

        <Button
          component={Link}
          href={`/anime/${anime.id}`}
          variant="contained"
          startIcon={<PlayArrowIcon />}
          tabIndex={ativo ? 0 : -1}
          sx={{
            mt: 0.5,
            backgroundColor: "common.white",
            color: "primary.main",
            fontWeight: 600,
            ":hover": { backgroundColor: "grey.200" },
          }}
        >
          Ver detalhes
        </Button>
      </Stack>
    </Box>
  );
};

const Seta = ({
  lado,
  aoClicar,
  rotulo,
}: {
  lado: "left" | "right";
  aoClicar: () => void;
  rotulo: string;
}) => (
  <IconButton
    onClick={aoClicar}
    aria-label={rotulo}
    sx={{
      position: "absolute",
      top: "50%",
      [lado]: 8,
      transform: "translateY(-50%)",
      zIndex: 3,
      color: "common.white",
      backgroundColor: (t) => alpha(t.palette.common.black, 0.35),
      ":hover": { backgroundColor: (t) => alpha(t.palette.common.black, 0.55) },
      display: { xs: "none", sm: "inline-flex" },
    }}
  >
    {lado === "left" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
  </IconButton>
);

export default HomeHero;
