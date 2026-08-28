import MangaSearchView from "@/views/manga/search";
import { Suspense } from "react";

/** Mesmo motivo da busca de animes: `useSearchParams` pede um boundary. */
const MangaSearch = () => (
  <Suspense>
    <MangaSearchView />
  </Suspense>
);

export default MangaSearch;
