"use client";

import { AppBar, Box, Typography, useTheme } from "@mui/material";
import Link from "next/link";

const FooterComponent = () => {
  const theme = useTheme();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          paddingBlock: 3,
          paddingInline: 5,
        }}
      >
        <Typography color="brand.chromeContrast">
          Catálogo e avaliações via{" "}
          <Link href="https://anilist.co" style={{ color: theme.vars.palette.brand.link }}>
            AniList
          </Link>
          {" · "}Episódios via{" "}
          <Link
            href="https://github.com/yzPeedro/SugoiAPI"
            style={{ color: theme.vars.palette.brand.link }}
          >
            SugoiAPI
          </Link>
          {" · "}Sinopses de mangá via{" "}
          <Link href="https://mangadex.org" style={{ color: theme.vars.palette.brand.link }}>
            MangaDex
          </Link>{" "}
          e seus grupos de tradução
        </Typography>
      </AppBar>
    </Box>
  );
};

export default FooterComponent;
