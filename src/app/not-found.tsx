import Navbar from "@/components/Navbar";
import { Box, Button, Card, Typography } from "@mui/material";
import Link from "next/link";

const NotFound = () => {
  return (
    <Box width="100%">
      <Navbar />
      <Card
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 108px)",
          borderRadius: 0,
          p: 5,
          gap: 2,
        }}
      >
        <Typography variant="h1" fontWeight={500}>
          404
        </Typography>
        <Typography variant="h4" fontWeight={500} textAlign="center">
          Página não encontrada.
        </Typography>
        <Link href="/animes">
          <Button variant="contained">Voltar</Button>
        </Link>
      </Card>
    </Box>
  );
};

export default NotFound;
