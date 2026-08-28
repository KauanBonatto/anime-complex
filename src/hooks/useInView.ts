"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Diz quando o elemento entrou na tela, uma única vez — depois disso o
 * observador é desligado.
 *
 * Serve para adiar trabalho que só vale a pena para o que está sendo visto:
 * a seção de episódios recentes fica abaixo da dobra, e buscar a imagem de
 * cada episódio já na abertura da home custaria dezenas de requisições que a
 * maioria das visitas nunca chega a olhar.
 */
export const useInView = <T extends HTMLElement>(margin = "200px") => {
  const ref = useRef<T | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const alvo = ref.current;
    if (!alvo || visivel) return;

    // Sem suporte ao observador, mostra tudo de uma vez em vez de nada.
    if (typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      { rootMargin: margin }
    );

    observador.observe(alvo);
    return () => observador.disconnect();
  }, [margin, visivel]);

  return { ref, visivel };
};
