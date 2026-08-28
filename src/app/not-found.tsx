import PageShell from "@/components/PageShell";
import { Button, Typography } from "@mui/material";
import Link from "next/link";

const NotFound = () => (
  <PageShell centered>
    <Typography variant="h1" fontWeight={500}>
      404
    </Typography>
    <Typography variant="h4" fontWeight={500} textAlign="center">
      Página não encontrada.
    </Typography>
    <Button component={Link} href="/animes" variant="contained">
      Voltar
    </Button>
  </PageShell>
);

export default NotFound;
