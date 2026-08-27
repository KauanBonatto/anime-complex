'use client';

import SearchIcon from "@mui/icons-material/Search";
import { AppBar, Box, Button, IconButton } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logoSvg from "../../assets/images/logo-white.svg";

const NavbarComponent = () => {
  const pathname = usePathname();
  // Cobre as duas rotas da área: a listagem (/mangas) e a ficha (/manga/123).
  const isManga = pathname?.startsWith("/manga") ?? false;

  const sections = [
    { label: "Animes", href: "/animes", active: !isManga },
    { label: "Mangás", href: "/mangas", active: isManga },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: "row",
          paddingBlock: 4,
          paddingInline: { xs: 2, sm: 5 },
          // O logo encolhe no celular, então travamos a altura do conteúdo:
          // as telas descontam um cabeçalho de 108px do próprio tamanho.
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
          sx={{ gap: { xs: 0.5, sm: 2 } }}
        >
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
                fontWeight: section.active ? 600 : 400,
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                paddingInline: { xs: 1, sm: 1.5 },
              }}
            >
              {section.label}
            </Button>
          ))}
          <Link href={isManga ? "/mangas/search" : "/animes/search"}>
            <IconButton>
              <SearchIcon color="action" />
            </IconButton>
          </Link>
        </Box>
      </AppBar>
    </Box>
  );
};

export default NavbarComponent;
