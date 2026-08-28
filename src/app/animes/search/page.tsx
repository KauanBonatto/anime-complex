import SearchView from "@/views/search";
import { Suspense } from "react";

/**
 * A tela lê o termo inicial de `useSearchParams`, que exige um boundary de
 * Suspense — sem ele o Next avisa que a rota inteira caiu para renderização no
 * cliente. O fallback é vazio de propósito: a própria view já monta o
 * cabeçalho e os esqueletos assim que aparece.
 */
const Search = () => (
  <Suspense>
    <SearchView />
  </Suspense>
);

export default Search;
