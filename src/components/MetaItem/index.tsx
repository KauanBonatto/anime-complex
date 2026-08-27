import { Box, Typography } from "@mui/material";

/** Par rótulo/valor das fichas de anime e de mangá. Some quando não há valor. */
const MetaItem = ({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) => {
  if (!value) return null;

  return (
    <Box>
      <Typography variant="caption" color="text.disabled" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
};

export default MetaItem;
