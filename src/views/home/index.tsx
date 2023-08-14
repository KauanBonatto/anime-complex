'use client';

import { useEffect, useCallback, useState } from "react";
import { Box, Button, Card, Grid, TextField, Typography } from "@mui/material";
import AnimeService from "@/services/AnimeSevice";
import AnimeCard from "@/components/AnimeCard";
import Navbar from "@/components/Navbar";


const HomeView = () => {
  const [search, setSearch] = useState<string>('');
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [popularAnimeList, setPopularAnimeList] = useState<ResponseApiProps | null>(null);

  const carregarDados = useCallback(async () => {
    if (search?.length == 0 || !popularAnimeList) {
      const popularAnimeListData = await AnimeService.getTopAiringAnime(pageNumber);
      setPopularAnimeList(popularAnimeListData);
    }
  }, [pageNumber, popularAnimeList, search?.length])

  const carregarPesquisa = useCallback(async () => {
    if (search) {
      const popularAnimeListData = await AnimeService.getAnimeBySearch(search, pageNumber);
      setPopularAnimeList(popularAnimeListData);
    }
  }, [pageNumber, search])

  useEffect(() => {
    carregarDados();
  }, [carregarDados])

  useEffect(() => {
    carregarPesquisa();
  }, [carregarPesquisa])

  const handleNextPage = () => {
    if (popularAnimeList?.hasNextPage) {
      setPageNumber(prevState => prevState + 1);
    }
  }

  const handlePrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(prevState => prevState - 1);
    }
  }

  const handleSearch = (search: string) => {
    setSearch(search.trim());
    if (pageNumber > 1) {
      setPageNumber(1);
    }
  };

    return (
      <Box>
        <Navbar />
        <Card sx={{ borderRadius: 0, p: 5 }}>
        
        <Box display='flex' alignItems='center' justifyContent='space-between' gap={5}>
          <Typography variant="h4" fontWeight={500}>Animes Populares</Typography>
          <TextField
            label="Buscar..."
            variant="standard"
            onChange={event => handleSearch(event.target.value)}
            />
        </Box>

          <Grid container mt={0} spacing={4}>
          {popularAnimeList?.results && popularAnimeList?.results?.length > 0 ? popularAnimeList?.results.map(anime => (
            <Grid item md={2.4} sm={4} xs={12} key={anime.id}>
              <AnimeCard anime={anime} />
            </Grid>
          )) : (
            <Grid item sm={12}>
              <Typography>Nenhum anime encontrado!</Typography>
            </Grid>
          )}

            <Grid item md={12} sm={12} xs={12}>
              <Button onClick={handlePrevPage} disabled={pageNumber == 1}>Prev</Button>
              <Button onClick={handleNextPage} disabled={!popularAnimeList?.hasNextPage}>Next</Button>
            </Grid>
          </Grid>
        </Card>
      </Box>
    );
}

export default HomeView;