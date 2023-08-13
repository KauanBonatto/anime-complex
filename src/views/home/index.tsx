'use client';

import { useEffect, useCallback, useState } from "react";
import { Box, Card, Grid, Typography } from "@mui/material";
import AnimeService from "@/services/AnimeSevice";
import AnimeCard from "@/components/AnimeCard";
import Navbar from "@/components/Navbar";


const HomeView = () => {
  const [animeList, setAnimeList] = useState<AnimeProps[]>([]);

  const carregarDados = useCallback(async () => {
    const animeData = await AnimeService.getTopAiringAnime();
    setAnimeList(animeData.results);
  }, [])

  useEffect(() => {
    carregarDados();
  }, [carregarDados])

    return (
      <Box>
        <Navbar />

        <Card sx={{ borderRadius: 0, p: 5 }}>
          <Typography variant="h4" color='text.secondary'>Animes Populares</Typography>
          
          <Grid container mt={0} spacing={6}>
          {animeList.map(anime => (
            <Grid item md={2.4} sm={4} xs={12} key={anime.id}>
              <AnimeCard anime={anime} />
            </Grid>
          ))}
          </Grid>
        </Card>
      </Box>
    );
}

export default HomeView;