import { GENRE_LABELS } from "@/utils/anime";
import { Chip, Grid, Typography } from "@mui/material";

const GenderFilter = ({
  filters,
  setFilters,
}: {
  filters: string[];
  setFilters: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  const filtersList = Object.entries(GENRE_LABELS).map(([value, label]) => ({
    label,
    value,
  }));

  const toggleChip = (filter: { label: string; value: string }) => {
    if (filters.includes(filter.value)) {
      setFilters((prevState) => {
        const newFilters = [...prevState];
        const index = newFilters.indexOf(filter.value);
        if (index >= 0) {
          newFilters.splice(index, 1);
          return newFilters;
        }
        return [];
      });
    } else {
      setFilters((prevState) => [...prevState, filter.value]);
    }
  };

  return (
    <Grid container>
      <Typography fontWeight={500} sx={{ userSelect: "none" }}>
        Gêneros
      </Typography>
      <Grid
        item
        display="flex"
        flexWrap="wrap"
        width="100%"
        gap={1}
        mt={1}
        mb={8}
      >
        {filtersList.map((filter, index) => (
          <Chip
            key={filter.value + index}
            sx={{
              transition: ".5s",
              border: (theme) => `1px solid ${theme.palette.primary.main}`,
            }}
            label={filter.label}
            color="primary"
            variant={filters.includes(filter.value) ? "filled" : "outlined"}
            onClick={() => toggleChip(filter)}
          />
        ))}
      </Grid>
    </Grid>
  );
};

export default GenderFilter;
