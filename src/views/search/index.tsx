"use client";

import AnimeGrid from "@/components/AnimeGrid";
import FilterBar from "@/components/FilterBar";
import PageShell from "@/components/PageShell";
import AnilistService from "@/services/AnilistService";
import { Box, TextField, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useDebounce } from "use-debounce";

const MIN_SEARCH_LENGTH = 3;

const SearchView = () => {
  const searchParams = useSearchParams();
  // A navbar manda o termo por query; daqui em diante quem manda é o campo.
  const initialSearch = searchParams?.get("q")?.trim() ?? "";

  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<string[]>([]);
  const [search, setSearch] = useState<string>(initialSearch);
  const [debouncedSearch] = useDebounce(search, 500);
  const [searchedList, setSearchedList] = useState<ResponseApiProps | null>(
    null
  );

  const getAnimeSearchedData = useCallback(
    async (pageNumber: number) => {
      setLoading(true);
      const searchedListData = await AnilistService.getAnimeBySearch(
        debouncedSearch,
        pageNumber,
        filters
      );
      setSearchedList(searchedListData);
      setLoading(false);
    },
    [debouncedSearch, filters]
  );

  const filtersToken = `${debouncedSearch}:${filters.join(",")}`;
  const hasSearch = debouncedSearch.length >= MIN_SEARCH_LENGTH;

  return (
    <PageShell loading={loading}>
      <Box mb={4}>
        <TextField
          fullWidth
          autoFocus
          autoComplete="off"
          defaultValue={initialSearch}
          label="Pesquisar..."
          variant="standard"
          size="medium"
          sx={{
            ".MuiFormLabel-root": { fontSize: "2.125rem", fontWeight: 500 },
            ".MuiInput-input": { marginTop: "1.2rem" },
          }}
          onChange={(event) => setSearch(event.target.value.trim())}
        />
      </Box>

      <FilterBar filters={filters} setFilters={setFilters} />

      {hasSearch ? (
        <AnimeGrid
          title="Animes pesquisados"
          loading={loading}
          animeData={searchedList as ResponseApiProps}
          getAnimeData={getAnimeSearchedData}
          resetToken={filtersToken}
          emptyMessage={`Nenhum anime encontrado para "${debouncedSearch}".`}
        />
      ) : (
        <Typography>
          Digite no campo acima pelo menos {MIN_SEARCH_LENGTH} caracteres para
          realizar uma pesquisa!
        </Typography>
      )}
    </PageShell>
  );
};

export default SearchView;
