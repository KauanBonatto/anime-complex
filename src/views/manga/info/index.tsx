"use client";

import MangaDetails from "@/components/MangaDetails";
import PageShell from "@/components/PageShell";
import MangaDexService from "@/services/MangaDexService";
import MangaService from "@/services/MangaService";
import { Grid, Skeleton } from "@mui/material";
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

    // O AniList só tem sinopse em inglês; o MangaDex costuma ter a versão em
    // pt-BR da mesma obra.
    const mangaDetailsData = await MangaService.getMangaDetails(mangaId);
    setMangaDetails(
      mangaDetailsData
        ? await MangaDexService.localizeDescription(mangaDetailsData)
        : null,
    );
    setNotFoundManga(!mangaDetailsData);
    setLoading(false);
  }, [mangaId]);

  useEffect(() => {
    getMangaInfoData();
  }, [getMangaInfoData]);

  if (notFoundManga) notFound();

  return (
    <PageShell loading={loading}>
      {loading && (
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Skeleton variant="rounded" height={240} />
          </Grid>
          <Grid item xs={12} sm="auto">
            <Skeleton variant="rounded" width={230} height={325} />
          </Grid>
          <Grid item xs={12} sm>
            <Skeleton variant="text" height={50} sx={{ maxWidth: 420 }} />
            <Skeleton variant="text" sx={{ maxWidth: 260 }} />
            <Skeleton variant="text" sx={{ mt: 3 }} />
            <Skeleton variant="text" />
            <Skeleton variant="text" sx={{ width: "70%" }} />
          </Grid>
        </Grid>
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
