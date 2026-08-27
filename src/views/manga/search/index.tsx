"use client";

import AnimeGrid from "@/components/AnimeGrid";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import MangaService from "@/services/MangaService";
import {
  Box,
  Card,
  Grid,
  LinearProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useState } from "react";
import { useDebounce } from "use-debounce";

const MangaSearchView = () => {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [searchedList, setSearchedList] = useState<ResponseApiProps | null>(
    null
  );

  const getMangaSearchedData = useCallback(
    async (pageNumber: number) => {
      setLoading(true);
      const searchedListData = await MangaService.getMangaBySearch(
        debouncedSearch,
        pageNumber
      );
      setSearchedList(searchedListData);
      setLoading(false);
    },
    [debouncedSearch]
  );

  const handleSearch = (search: string) => {
    setSearch(search.trim());
  };

  return (
    <Box width="100%">
      {loading && (
        <LinearProgress
          sx={{ width: "100%", position: "fixed" }}
          color="primary"
        />
      )}
      <Navbar />
      <Card
        sx={{
          minHeight: "calc(100vh - 108px)",
          borderRadius: 0,
          p: 5,
        }}
      >
        <Grid container>
          <Grid
            item
            display="flex"
            flexWrap="wrap"
            width="100%"
            gap={1}
            mt={1}
            mb={5}
          >
            <TextField
              fullWidth
              autoFocus
              autoComplete="off"
              label="Pesquisar mangás..."
              variant="standard"
              size="medium"
              sx={{
                ".MuiFormLabel-root": { fontSize: "2.125rem", fontWeight: 500 },
                ".MuiInput-input": { marginTop: "1.2rem" },
              }}
              onChange={(event) => handleSearch(event.target.value)}
            />
          </Grid>
        </Grid>
        {debouncedSearch.length > 2 ? (
          <AnimeGrid
            media="manga"
            title="Mangás pesquisados"
            loading={loading}
            animeData={searchedList as ResponseApiProps}
            getAnimeData={getMangaSearchedData}
            resetToken={debouncedSearch}
            emptyMessage={`Nenhum mangá encontrado para "${debouncedSearch}".`}
          />
        ) : (
          <Grid item sx={{ pl: "0px !important" }}>
            <Typography>
              Digite no campo acima pelo menos 3 caracteres para realizar uma
              pesquisa!
            </Typography>
          </Grid>
        )}
      </Card>
      <Footer />
    </Box>
  );
};

export default MangaSearchView;
