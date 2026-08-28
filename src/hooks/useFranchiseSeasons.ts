"use client";

import AnilistService from "@/services/AnilistService";
import { useEffect, useState } from "react";

/**
 * Temporadas da franquia do anime aberto.
 *
 * Montar a lista custa uma requisição por elo da sequência, então ela é sempre
 * secundária: começa vazia, a tela renderiza sem esperar, e o seletor de
 * temporadas aparece quando (e se) os dados chegarem. Um anime avulso devolve
 * lista vazia, e nesse caso não há nada a exibir.
 */
export const useFranchiseSeasons = (animeId?: string | null) => {
  const [seasons, setSeasons] = useState<FranchiseSeasonProps[]>([]);

  useEffect(() => {
    if (!animeId) return;

    let active = true;
    setSeasons([]);

    AnilistService.getFranchiseSeasons(animeId)
      .then((data) => {
        // Navegar entre temporadas troca o id: sem isto, a resposta da anterior
        // sobrescreveria a lista da que já está na tela.
        if (active) setSeasons(data);
      })
      .catch(() => {
        // A franquia é um extra; sem ela a tela segue inteira.
      });

    return () => {
      active = false;
    };
  }, [animeId]);

  return seasons;
};
