"use client";

import { AppBar, Box, Typography, useTheme } from "@mui/material";
import Link from "next/link";

const FooterComponent = () => {
  const theme = useTheme();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          paddingBlock: 3,
          paddingInline: 5,
        }}
      >
        <Typography color="text.secondary">
          Created using{" "}
          <Link
            href="https://github.com/consumet/api.consumet.org"
            style={{ color: `#2196f3` }}
          >
            api.consumet.org
          </Link>
        </Typography>
      </AppBar>
    </Box>
  );
};

export default FooterComponent;
