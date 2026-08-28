"use client";

import SearchIcon from "@mui/icons-material/Search";
import {
  AppBar,
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  alpha,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import logoSvg from "../../assets/images/logo-white.svg";
import { NAVBAR_HEIGHT } from "@/components/PageShell/height";

const NavbarComponent = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [term, setTerm] = useState("");

  // Cobre as duas rotas da área: a listagem (/mangas) e a ficha (/manga/123).
  const isManga = pathname?.startsWith("/manga") ?? false;
  const searchHref = isManga ? "/mangas/search" : "/animes/search";

  const sections = [
    { label: "Animes", href: "/animes", active: !isManga },
    { label: "Mangás", href: "/mangas", active: isManga },
  ];

  /**
   * A busca em si mora na página de busca, que já debounce e pagina. A navbar
   * só leva o termo até lá pela query, e a página o adota como valor inicial.
   */
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `${searchHref}?q=${encodeURIComponent(query)}` : searchHref);
  };

  return (
    <AppBar
      // Sticky, e não fixed, para o cabeçalho continuar ocupando espaço no
      // fluxo — é o que mantém o `calc(100vh - NAVBAR_HEIGHT)` das telas certo.
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        height: NAVBAR_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: "row",
        gap: { xs: 1, sm: 2 },
        paddingInline: { xs: 2, sm: 3, md: 5 },
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.92),
        backdropFilter: "blur(8px)",
        borderBottom: (theme) =>
          `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
        "& .MuiButtonBase-root, & > a": { minHeight: 44 },
      }}
    >
      <Link href="/animes">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: { xs: 110, sm: 150 },
          }}
        >
          <Image
            priority
            width={150}
            src={logoSvg}
            draggable={false}
            alt="Anime complex"
            style={{ width: "100%", height: "auto" }}
          />
        </Box>
      </Link>

      <Box
        display="flex"
        alignItems="center"
        sx={{ gap: { xs: 0.5, sm: 2 }, flexShrink: 0 }}
      >
        {/* A partir de sm a busca fica à mão; no celular ela viraria um campo
            estreito demais, então continua sendo um atalho para a página. */}
        <Box
          component="form"
          onSubmit={submitSearch}
          sx={{ display: { xs: "none", sm: "block" } }}
        >
          <TextField
            size="small"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={isManga ? "Buscar mangás..." : "Buscar animes..."}
            inputProps={{ "aria-label": "Buscar" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "common.white" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { sm: 190, md: 260 },
              "& .MuiOutlinedInput-root": {
                color: "common.white",
                borderRadius: 5,
                backgroundColor: (theme) =>
                  alpha(theme.palette.common.white, 0.12),
                transition: ".2s",
                "& fieldset": { border: "none" },
                "&:hover, &.Mui-focused": {
                  backgroundColor: (theme) =>
                    alpha(theme.palette.common.white, 0.2),
                },
              },
              "& .MuiOutlinedInput-input::placeholder": {
                color: "common.white",
                opacity: 0.7,
              },
            }}
          />
        </Box>

        {sections.map((section) => (
          <Button
            key={section.href}
            component={Link}
            href={section.href}
            size="small"
            color="inherit"
            variant={section.active ? "outlined" : "text"}
            sx={{
              flexShrink: 0,
              borderRadius: 5,
              fontWeight: section.active ? 600 : 400,
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              paddingInline: { xs: 1, sm: 1.5 },
            }}
          >
            {section.label}
          </Button>
        ))}

        <IconButton
          component={Link}
          href={searchHref}
          aria-label="Buscar"
          sx={{ display: { xs: "inline-flex", sm: "none" } }}
        >
          <SearchIcon color="action" />
        </IconButton>
      </Box>
    </AppBar>
  );
};

export default NavbarComponent;
