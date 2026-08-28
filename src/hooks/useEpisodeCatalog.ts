"use client";

import TmdbService from "@/services/TmdbService";
import { useEffect, useMemo, useRef, useState } from "react";

/** Teto de buscas por ficha, para uma lista longa não virar uma enxurrada. */
const MAX_BUSCAS = 4;

/**
 * Os episódios da obra, completados sob demanda.
 *
 * A ficha traz de saída só a temporada que a tabela de equivalência aponta. Nas
 * séries longas — que o AniList numera de forma contínua e o TMDB divide em
 * temporadas — isso deixa a maior parte da lista sem imagem e sem título, ainda
 * que o TMDB os tenha. Sem este preenchimento o mesmo episódio aparecia
 * ilustrado no card de lançamentos da home e vazio na lista da temporada.
 *
 * `ancoras` são os episódios que a tela está prestes a mostrar. Basta um deles
 * faltando para buscar a temporada inteira em volta, então uma requisição cobre
 * a página; a segunda âncora existe para as páginas que caem em cima da virada
 * de uma temporada para a outra.
 */
export const useEpisodeCatalog = (
  anime: AnimeDetailsProps | null,
  ancoras: number[]
) => {
  const [extras, setExtras] = useState<Record<number, EpisodeInfoProps>>({});
  const pedidos = useRef<Set<number>>(new Set());

  const animeId = anime?.id;
  const base = anime?.episodes;
  // A lista de âncoras é remontada a cada render; o texto é o que de fato muda.
  const chaveAncoras = ancoras.join(",");

  // Trocar de obra zera o que já foi buscado.
  useEffect(() => {
    pedidos.current = new Set();
    setExtras({});
  }, [animeId]);

  useEffect(() => {
    if (!anime) return;

    for (const numero of chaveAncoras.split(",").map(Number)) {
      if (!numero || base?.[numero]) continue;
      if (pedidos.current.has(numero)) continue;
      if (pedidos.current.size >= MAX_BUSCAS) break;

      pedidos.current.add(numero);
      TmdbService.getEpisodesAround(anime, numero)
        .then((novos) => {
          if (Object.keys(novos).length) {
            setExtras((atual) => ({ ...atual, ...novos }));
          }
        })
        .catch(() => {
          // A imagem é um extra; o degradê com o número segura o lugar.
        });
    }
  }, [anime, base, chaveAncoras]);

  return useMemo(() => ({ ...(base ?? {}), ...extras }), [base, extras]);
};
