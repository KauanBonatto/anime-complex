'use client';

import SearchIcon from "@mui/icons-material/Search";
import { AppBar, Box, IconButton } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import logoSvg from "../../assets/images/logo-white.svg";

const NavbarComponent = () => {
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
          paddingInline: 5,
        }}
      >
        <Link href="/animes">
          <Image
            priority
            width={150}
            src={logoSvg}
            draggable={false}
            alt="Anime complex"
          />
        </Link>
        <Box display="flex" gap="1rem">
          <Link href="/animes/search">
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