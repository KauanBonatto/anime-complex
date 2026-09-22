import PrefetchLink from "@/components/PrefetchLink";
import AnilistService from "@/services/AnilistService";
import MangaService from "@/services/MangaService";
import { Box, Button, Skeleton, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";
import AnimeCard from "./AnimeCard";

const SKELETON_PLACEHOLDERS = Array.from({ length: 12 });

const AnimeGrid = ({
  title,
  loading,
  animeData,
  getAnimeData,
  resetToken,
  emptyMessage = "Nenhum anime encontrado com os parâmetros informados!",
  media = "anime",
  variant = "poster",
}: AnimeGridProps) => {
  const theme = useTheme();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [currentToken, setCurrentToken] = useState(resetToken);
  const topRef = useRef<HTMLDivElement | null>(null);
  /**
   * Trocar de página com o dedo no botão deixa o usuário no rodapé da grade,
   * olhando para o fim de uma lista que acabou de ser substituída. Só rolamos
   * quando foi ele quem pediu a troca — na primeira carga a página deve ficar
   * onde está.
   */
  const pediuTroca = useRef(false);

  // Ao trocar os filtros voltamos para a primeira página antes do fetch.
  if (resetToken !== currentToken) {
    setCurrentToken(resetToken);
    setPageNumber(1);
  }

  const irParaPagina = (proxima: number) => {
    pediuTroca.current = true;
    setPageNumber(proxima);
  };

  const handleNextPage = () => {
    if (animeData?.hasNextPage) irParaPagina(pageNumber + 1);
  };

  const handlePrevPage = () => {
    if (pageNumber > 1) irParaPagina(pageNumber - 1);
  };

  useEffect(() => {
    getAnimeData(pageNumber);

    if (pediuTroca.current) {
      pediuTroca.current = false;
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [getAnimeData, pageNumber]);

  /**
   * Os resultados que já estão na tela continuam nela enquanto a próxima
   * página carrega, apenas esmaecidos. Trocá-los por doze esqueletos a cada
   * clique fazia a grade piscar inteira e o usuário perder a referência do
   * lugar. Os esqueletos ficam só para quando não há nada a mostrar ainda —
   * a primeira carga e a troca de filtro.
   */
  const results = animeData?.results ?? [];
  const hasResults = results.length > 0;
  const showSkeletons = loading && !hasResults;
  const isRefreshing = loading && hasResults;
  /**
   * "Nenhum anime encontrado" só depois de uma resposta de verdade. Sem esta
   * guarda, chegar na busca com `?q=` já preenchido mostrava a mensagem de
   * lista vazia no quadro entre a montagem e o disparo do efeito.
   */
  const showEmpty = !loading && !hasResults && !!animeData;

  const isRelease = variant === "release";

  /**
   * O card de lançamento leva direto ao player do episódio anunciado; passar
   * pela ficha só para clicar no mesmo episódio de novo seria um desvio.
   */
  const cardHref = (anime: AnimeProps) =>
    isRelease && anime.episodeNumber
      ? `/anime/${anime.id}/${anime.episodeNumber}`
      : `/${media}/${anime.id}`;

  /**
   * A ficha é a primeira coisa que qualquer um dos dois destinos pede — tanto
   * a página da obra quanto a do episódio começam por ela. Adiantá-la no hover
   * cobre a maior parte da espera do clique.
   */
  const prefetchCard = (anime: AnimeProps) => () =>
    media === "manga"
      ? MangaService.getMangaDetails(anime.id)
      : AnilistService.getAnimeDetails(anime.id);

  // Colunas fluidas: os cards nunca encostam porque o gap é fixo e a largura
  // de cada coluna se ajusta ao espaço disponível. O card de lançamento é
  // horizontal, então pede colunas bem mais largas que o da capa.
  const gridSx = {
    display: "grid",
    width: "100%",
    gap: isRelease ? 2 : 3,
    gridTemplateColumns: isRelease
      ? "repeat(auto-fill, minmax(320px, 1fr))"
      : "repeat(auto-fill, minmax(180px, 1fr))",
    [theme.breakpoints.down("sm")]: {
      gap: 2,
      gridTemplateColumns: isRelease
        ? "1fr"
        : "repeat(auto-fill, minmax(140px, 1fr))",
    },
  } as const;

  return (
    <Box width="100%" ref={topRef}>
      <Typography
        variant="h4"
        fontWeight={500}
        sx={{
          userSelect: "none",
          textAlign: "start",
          mb: 3,
          [theme.breakpoints.down("sm")]: {
            fontSize: "1.6rem",
            textAlign: "center",
          },
        }}
      >
        {title}
      </Typography>

      <Box
        sx={{
          ...gridSx,
          // A lista anterior continua legível durante a troca, mas sem aceitar
          // clique: seguir um card que está prestes a sair do lugar levaria o
          // usuário para a obra errada.
          ...(isRefreshing && {
            opacity: 0.45,
            pointerEvents: "none",
            transition: "opacity .2s ease",
          }),
        }}
      >
        {showSkeletons &&
          SKELETON_PLACEHOLDERS.map((_, index) =>
            isRelease ? (
              <Box key={index} width="100%">
                <Skeleton
                  variant="rounded"
                  sx={{ width: "100%", height: "auto", aspectRatio: "16 / 9" }}
                />
                <Skeleton variant="text" sx={{ mt: 1 }} />
              </Box>
            ) : (
              <Box key={index} width="100%">
                <Skeleton
                  variant="rounded"
                  sx={{ width: "100%", height: "auto", aspectRatio: "180 / 254" }}
                />
                <Skeleton variant="text" sx={{ mt: 0.5 }} />
                <Skeleton variant="text" sx={{ width: "80%", mt: 0.5 }} />
              </Box>
            )
          )}

        {hasResults &&
          results.map((anime, index) => (
            <PrefetchLink
              key={anime.id + index}
              href={cardHref(anime)}
              carregar={prefetchCard(anime)}
            >
              <AnimeCard anime={anime} media={media} variant={variant} />
            </PrefetchLink>
          ))}
      </Box>

      {showEmpty && <Typography>{emptyMessage}</Typography>}


      <Box display="flex" gap={2} mt={4}>
        <Button
          onClick={handlePrevPage}
          disabled={loading || pageNumber == 1}
          variant="outlined"
        >
          Anterior
        </Button>
        <Button
          onClick={handleNextPage}
          disabled={loading || !animeData?.hasNextPage}
          variant="outlined"
        >
          Próximo
        </Button>
      </Box>
    </Box>
  );
};

export default AnimeGrid;
