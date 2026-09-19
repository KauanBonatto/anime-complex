"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

interface GenreFilterValue {
  filters: string[];
  setFilters: Dispatch<SetStateAction<string[]>>;
  toggleGenre: (genre: string) => void;
  clearFilters: () => void;
}

const GenreFilterContext = createContext<GenreFilterValue | null>(null);

/**
 * Filtro de gêneros compartilhado entre o cabeçalho e as listagens.
 *
 * Antes cada tela guardava o próprio `useState` e desenhava a barra de
 * filtros acima do conteúdo. Com o controle no header — que vive fora das
 * telas, no PageShell — o estado precisa morar acima dos dois; daí o contexto.
 * A escolha segue valendo ao navegar entre animes e mangás porque a taxonomia
 * de gêneros do AniList é a mesma nos dois catálogos.
 */
export const GenreFilterProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<string[]>([]);

  const value = useMemo<GenreFilterValue>(
    () => ({
      filters,
      setFilters,
      toggleGenre: (genre) =>
        setFilters((previous) =>
          previous.includes(genre)
            ? previous.filter((current) => current !== genre)
            : [...previous, genre]
        ),
      clearFilters: () => setFilters([]),
    }),
    [filters]
  );

  return (
    <GenreFilterContext.Provider value={value}>
      {children}
    </GenreFilterContext.Provider>
  );
};

export const useGenreFilters = () => {
  const context = useContext(GenreFilterContext);

  if (!context) {
    throw new Error("useGenreFilters exige o GenreFilterProvider acima na árvore.");
  }

  return context;
};
