"use client";

import AnimeGrid from "@/components/AnimeGrid";
import HomeHero from "@/components/HomeHero";
import PageShell from "@/components/PageShell";
import UpcomingSchedule from "@/components/UpcomingSchedule";
import { useGenreFilters } from "@/contexts/GenreFilterContext";
import AnilistService from "@/services/AnilistService";
import { pickHighlights } from "@/utils/anime";
import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";

/** Obras no carrossel de destaque. Poucas, para o revezamento ter fim. */
const HIGHLIGHT_COUNT = 6;

const HomeView = () => {
  // O filtro vive no cabeçalho; aqui a tela só consome a escolha.
  const { filters } = useGenreFilters();
  const [highlights, setHighlights] = useState<AnimeProps[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingEpisodes, setUpcomingEpisodes] = useState<
    UpcomingEpisodeProps[]
  >([]);
  const [popularAnimeList, setPopularAnimeList] =
    useState<ResponseApiProps | null>(null);
  const [recentAnimeList, setRecentAnimeList] =
    useState<ResponseApiProps | null>(null);

  const getAnimePopularData = useCallback(
    async (pageNumber: number) => {
      setPopularLoading(true);
      const popularAnimeListData = await AnilistService.getPopularAnime(
        pageNumber,
        filters
      );
      setPopularAnimeList(popularAnimeListData);
      setPopularLoading(false);
    },
    [filters]
  );

  const getAnimeRecentData = useCallback(
    async (pageNumber: number) => {
      setRecentLoading(true);
      const recentAnimeListData = await AnilistService.getRecentAnime(
        pageNumber,
        filters
      );
      setRecentAnimeList(recentAnimeListData);
      setRecentLoading(false);
    },
    [filters]
  );

  const filtersToken = filters.join(",");

  /**
   * O calendário não pagina e não depende das duas listas acima, então busca
   * sozinho — e refaz a conta a cada troca de filtro, que é o que decide quais
   * obras ocupam as vagas.
   */
  useEffect(() => {
    let ativo = true;
    setUpcomingLoading(true);

    AnilistService.getUpcomingEpisodes(filters)
      .then((episodes) => {
        if (!ativo) return;
        setUpcomingEpisodes(episodes);
      })
      .finally(() => {
        if (ativo) setUpcomingLoading(false);
      });

    return () => {
      ativo = false;
    };
    // `filters` é remontado a cada render do contexto; o token é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersToken]);

  /**
   * O destaque é sorteado uma vez por conjunto de filtros e guardado, e não
   * derivado das listas a cada render: elas são substituídas quando o usuário
   * pagina, e o carrossel trocaria de obras no meio da navegação.
   */
  useEffect(() => {
    setHighlights([]);
  }, [filtersToken]);

  useEffect(() => {
    if (highlights.length) return;
    // Espera as duas fontes para o sorteio poder misturar as duas.
    if (!popularAnimeList?.results?.length || !recentAnimeList?.results?.length) {
      return;
    }

    setHighlights(
      pickHighlights(
        popularAnimeList.results,
        recentAnimeList.results,
        HIGHLIGHT_COUNT
      )
    );
  }, [popularAnimeList, recentAnimeList, highlights.length]);

  return (
    <PageShell loading={popularLoading || recentLoading || upcomingLoading}>
      <HomeHero animes={highlights} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 8, md: 12 } }}>
        {/* O calendário e os recentes são o mesmo assunto — o que vem e o que
            acabou de sair —, então andam mais juntos que o resto da home. */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <UpcomingSchedule
            episodes={upcomingEpisodes}
            loading={upcomingLoading}
          />
          <AnimeGrid
            title={filters.length ? "Em Exibição" : "Episódios Recentes"}
            loading={recentLoading}
            animeData={recentAnimeList as ResponseApiProps}
            getAnimeData={getAnimeRecentData}
            resetToken={filtersToken}
            // Sem filtro a lista é a grade de exibição, com número de episódio
            // e horário — dados que só o card de lançamento mostra.
            variant={filters.length ? "poster" : "release"}
          />
        </Box>

        <AnimeGrid
          title="Animes Populares"
          loading={popularLoading}
          animeData={popularAnimeList as ResponseApiProps}
          getAnimeData={getAnimePopularData}
          resetToken={filtersToken}
        />
      </Box>

      <Typography variant="caption" color="text.disabled" display="block" mt={6}>
        Catálogo e avaliações fornecidos pelo AniList.
      </Typography>
    </PageShell>
  );
};

export default HomeView;
