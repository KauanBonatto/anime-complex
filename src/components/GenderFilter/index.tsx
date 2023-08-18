import { Chip, Stack } from "@mui/material";
import { useEffect } from "react";

const GenderFilter = ({
  filters,
  setFilters,
  filterAnimesList,
}: {
  filters: string[];
  setFilters: React.Dispatch<React.SetStateAction<string[]>>;
  filterAnimesList: () => Promise<void>;
}) => {
  const filtersList = [
    { label: "Ação", value: "Action" },
    { label: "Aventura", value: "Adventure" },
    { label: "Romance", value: "Romance" },
    { label: "Fantasia", value: "Fantasy" },
    { label: "Histórico", value: "Historical" },
    { label: "Comédia", value: "Comedy" },
    { label: "Sobrevivencia", value: "Survival" },
    { label: "Supernatural", value: "Supernatural" },
    { label: "Shounen", value: "Shounen" },
    { label: "Escolar", value: "School" },
  ];

  const toggleChip = (filter: { label: string; value: string }) => {
    if (filters.includes(filter.value)) {
      setFilters([]);
      // setFilters((prevState) => {
      //   const index = prevState.indexOf(filter.value);
      //   if (index >= 0) {
      //     prevState.splice(index, 1);
      //     console.log(prevState);
      //     return prevState;
      //   }
      //   return [];
      // });
    } else {
      setFilters((prevState) => [...prevState, filter.value]);
    }
  };

  useEffect(() => {
    filterAnimesList();
  }, [filterAnimesList, filters]);

  return (
    <Stack direction="row" spacing={1} mb={8}>
      {filtersList.map((filter, index) => (
        <Chip
          key={filter.value + index}
          label={filter.label}
          color="primary"
          variant={filters.includes(filter.value) ? "filled" : "outlined"}
          onClick={() => toggleChip(filter)}
        />
      ))}
    </Stack>
  );
};

export default GenderFilter;
