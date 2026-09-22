"use client";

import { useRef } from "react";

/**
 * Adianta a busca dos dados de um destino quando o ponteiro encosta no link.
 *
 * O `<Link>` do Next já pré-carrega o código da rota, mas neste app as telas
 * não trazem dado nenhum do servidor: elas montam e só então pedem a ficha.
 * Entre o clique e o conteúdo havia sempre uma ida à rede inteira. Como o
 * cache dos serviços (`src/utils/cache.ts`) guarda o resultado e junta
 * chamadas simultâneas para a mesma chave, basta disparar a mesma busca que a
 * tela faria — quando o clique chega, a resposta já está em mãos e a página
 * abre preenchida.
 *
 * O hover é um palpite, e um palpite errado custa uma requisição que o cache
 * provavelmente usaria depois de qualquer forma. Por isso dispara uma única
 * vez por elemento e engole o erro: quem trata falha é a tela de destino.
 */
export const usePrefetchOnHover = (carregar: () => Promise<unknown>) => {
  const jaPedido = useRef(false);

  const disparar = () => {
    if (jaPedido.current) return;
    jaPedido.current = true;
    carregar().catch(() => {});
  };

  return {
    onMouseEnter: disparar,
    // No celular não há hover: o toque começa uns 100ms antes do clique, e
    // esse adiantamento já cobre parte da latência.
    onTouchStart: disparar,
    // Quem navega por teclado chega pelo foco, e merece o mesmo adiantamento.
    onFocus: disparar,
  };
};
