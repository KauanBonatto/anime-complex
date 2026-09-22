import { Box, Grid, Skeleton, Stack, Typography } from "@mui/material";

/**
 * Os esqueletos de cada tela, num módulo só.
 *
 * Eles existiam embutidos nas views, e só apareciam depois que o componente
 * da rota montava — ou seja, depois de baixar o JavaScript dela. Aqui eles
 * também alimentam os `loading.tsx`, que o Next mostra no instante do clique,
 * antes disso tudo. O desenho precisa ser o mesmo nos dois lugares: é o que
 * faz o conteúdo real substituir o esqueleto sem nada saltar de lugar.
 */

const CARDS = Array.from({ length: 12 });

/** Uma grade de capas com o título por cima, como o AnimeGrid desenha. */
export const GridSkeleton = ({
  title,
  variant = "poster",
}: {
  title?: string;
  variant?: "poster" | "release";
}) => (
  <Box width="100%">
    {title ? (
      <Typography variant="h4" fontWeight={500} sx={{ mb: 3 }}>
        {title}
      </Typography>
    ) : (
      <Skeleton variant="text" height={48} sx={{ maxWidth: 280, mb: 3 }} />
    )}

    <Box
      sx={{
        display: "grid",
        width: "100%",
        gap: variant === "release" ? 2 : 3,
        gridTemplateColumns:
          variant === "release"
            ? "repeat(auto-fill, minmax(320px, 1fr))"
            : "repeat(auto-fill, minmax(180px, 1fr))",
      }}
    >
      {CARDS.map((_, index) => (
        <Box key={index} width="100%">
          <Skeleton
            variant="rounded"
            sx={{
              width: "100%",
              height: "auto",
              aspectRatio: variant === "release" ? "16 / 9" : "180 / 254",
            }}
          />
          <Skeleton variant="text" sx={{ mt: 1 }} />
          {variant === "poster" && (
            <Skeleton variant="text" sx={{ width: "80%", mt: 0.5 }} />
          )}
        </Box>
      ))}
    </Box>
  </Box>
);

/** Banner, capa e bloco de texto — a ficha de um anime ou de um mangá. */
export const DetailsSkeleton = () => (
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
);

/** Player, navegação e a lista lateral da tela de episódio. */
export const EpisodeSkeleton = () => (
  <Grid container spacing={4}>
    <Grid item xs={12} lg={8}>
      <Box mb={3}>
        <Skeleton variant="text" height={48} sx={{ maxWidth: 380 }} />
        <Skeleton variant="text" sx={{ maxWidth: 200 }} />
      </Box>
      <Skeleton
        variant="rounded"
        sx={{ width: "100%", height: "auto", aspectRatio: "16 / 9", mb: 4 }}
      />
      <Stack direction="row" gap={2}>
        <Skeleton variant="rounded" width={180} height={37} />
        <Skeleton variant="rounded" width={180} height={37} />
      </Stack>
    </Grid>
    <Grid item xs={12} lg={4}>
      <Skeleton variant="rounded" sx={{ width: "100%", height: 420 }} />
    </Grid>
  </Grid>
);

/** A home inteira: destaque, calendário e as duas grades. */
export const HomeSkeleton = () => (
  <>
    <Skeleton
      variant="rounded"
      sx={{ width: "100%", height: { xs: 320, sm: 380, md: 440 }, mb: { xs: 3, md: 5 } }}
    />
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 8, md: 12 } }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Box width="100%">
          <Typography variant="h4" fontWeight={500} sx={{ mb: 3 }}>
            Próximos Episódios
          </Typography>
          <Stack direction="row" gap={2} sx={{ overflow: "hidden" }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                sx={{ flexShrink: 0, width: 232, height: 92 }}
              />
            ))}
          </Stack>
        </Box>
        <GridSkeleton title="Episódios Recentes" variant="release" />
      </Box>
      <GridSkeleton title="Animes Populares" />
    </Box>
  </>
);

/** As três grades da home de mangás. */
export const MangaHomeSkeleton = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 8, md: 12 } }}>
    <GridSkeleton title="Mangás Populares" />
    <GridSkeleton title="Melhores Avaliados" />
    <GridSkeleton title="Lançamentos Recentes" />
  </Box>
);

/**
 * A busca. O campo é um esqueleto do tamanho do `TextField` de verdade, e não
 * um campo falso: um campo que aceita foco e some meio segundo depois rouba o
 * que a pessoa começou a digitar.
 */
export const SearchSkeleton = () => (
  <>
    <Box mb={4}>
      <Skeleton variant="text" height={72} sx={{ maxWidth: 420 }} />
    </Box>
    <GridSkeleton />
  </>
);
