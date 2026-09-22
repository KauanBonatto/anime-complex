"use client";

import AnimeDetails from "@/components/AnimeDetails";
import AnimeEpisodesGrid from "@/components/AnimeEpisodesGrid";
import PageShell from "@/components/PageShell";
import { DetailsSkeleton } from "@/components/Skeletons";
import SeasonStrip from "@/components/SeasonStrip";
import { useFranchiseSeasons } from "@/hooks/useFranchiseSeasons";
import AnilistService from "@/services/AnilistService";
import TmdbService from "@/services/TmdbService";
import { Box } from "@mui/material";
import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const AnimeInfoView = ({ params }: { params: { anime_id: string } }) => {
  const animeId = params.anime_id;
  const [loading, setLoading] = useState(true);
  const [notFoundAnime, setNotFoundAnime] = useState(false);
  const [animeDetails, setAnimeDetails] = useState<AnimeDetailsProps | null>(
    null
  );

  const seasons = useFranchiseSeasons(animeId);

  const getAnimeInfoData = useCallback(async () => {
    setLoading(true);

    const animeDetailsData = await AnilistService.getAnimeDetails(animeId);
    if (!animeDetailsData) {
      setNotFoundAnime(true);
      setLoading(false);
      return;
    }

    // A ficha abre com o texto do AniList assim que ele responde. A sinopse e
    // os dados de episódio vêm dele em inglês, e o TMDB tem a versão em pt-BR
    // — mas essa tradução custa uma cadeia de requisições, e esperar por ela
    // deixava a tela inteira em esqueleto. Ela entra depois, no lugar, e só se
    // a página ainda estiver na mesma obra: uma resposta atrasada não pode
    // sobrescrever a ficha que o usuário já trocou.
    setAnimeDetails(animeDetailsData);
    setLoading(false);

    TmdbService.localize(animeDetailsData).then((traduzido) => {
      setAnimeDetails((current) =>
        current?.id === traduzido.id ? traduzido : current
      );
    });
  }, [animeId]);

  useEffect(() => {
    getAnimeInfoData();
  }, [getAnimeInfoData]);

  if (notFoundAnime) notFound();

  return (
    <PageShell loading={loading}>
      {loading && (
        <DetailsSkeleton />
      )}

      {animeDetails && (
        <Box display="flex" flexDirection="column" gap={5}>
          <AnimeDetails anime={animeDetails} />
          <SeasonStrip seasons={seasons} />
          <AnimeEpisodesGrid anime={animeDetails} />
        </Box>
      )}
    </PageShell>
  );
};

export default AnimeInfoView;
