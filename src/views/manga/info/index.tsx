"use client";

import MangaDetails from "@/components/MangaDetails";
import PageShell from "@/components/PageShell";
import { DetailsSkeleton } from "@/components/Skeletons";
import MangaDexService from "@/services/MangaDexService";
import MangaService from "@/services/MangaService";
import { Grid } from "@mui/material";
import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const MangaInfoView = ({ params }: { params: { manga_id: string } }) => {
  const mangaId = params.manga_id;
  const [loading, setLoading] = useState(true);
  const [notFoundManga, setNotFoundManga] = useState(false);
  const [mangaDetails, setMangaDetails] = useState<MangaDetailsProps | null>(
    null,
  );

  const getMangaInfoData = useCallback(async () => {
    setLoading(true);

    const mangaDetailsData = await MangaService.getMangaDetails(mangaId);
    if (!mangaDetailsData) {
      setNotFoundManga(true);
      setLoading(false);
      return;
    }

    // A ficha abre com o texto do AniList, que só tem sinopse em inglês. O
    // MangaDex costuma ter a versão em pt-BR da mesma obra, mas encontrá-la
    // custa uma busca por título de cada vez — esperar por isso deixava a tela
    // em esqueleto. A tradução entra depois, e só se a página ainda estiver na
    // mesma obra.
    setMangaDetails(mangaDetailsData);
    setLoading(false);

    MangaDexService.localizeDescription(mangaDetailsData).then((traduzido) => {
      setMangaDetails((current) =>
        current?.id === traduzido.id ? traduzido : current,
      );
    });
  }, [mangaId]);

  useEffect(() => {
    getMangaInfoData();
  }, [getMangaInfoData]);

  if (notFoundManga) notFound();

  return (
    <PageShell loading={loading}>
      {loading && (
        <DetailsSkeleton />
      )}

      {mangaDetails && (
        <Grid container>
          <Grid item width="100%" mt={1} mb={5}>
            <MangaDetails manga={mangaDetails} />
          </Grid>
        </Grid>
      )}
    </PageShell>
  );
};

export default MangaInfoView;
