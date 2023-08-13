'use client';

import Image from "next/image";
import logoSvg from "../../assets/images/logo-white.svg";
import { AppBar, Box, Link } from '@mui/material';

const NavbarComponent = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar 
        position="static" 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          flexDirection: 'row', 
          paddingBlock: 2, 
          paddingInline: 5 
        }}>
        <Image
          priority
          width={120}
          src={logoSvg}
          draggable={false}
          alt="Anime complex"
        />
        <Box display='flex' gap='1rem'>
          <Link
            display='flex'
            alignItems='center' 
            color='text.primary' 
            href="/animes/popular"
            underline="none"
            >
            Populares            
          </Link>

          <Link
            display='flex' 
            alignItems='center' 
            color='text.primary' 
            href="/animes/popular"
            underline='none'
            >
            Gêneros            
          </Link>
        </Box>
      </AppBar>
    </Box>
  );
}

export default NavbarComponent;