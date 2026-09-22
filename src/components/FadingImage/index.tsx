"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * `next/image` que aparece com um fade em vez de surgir de supetão.
 *
 * As grades são dezenas de capas que chegam em ordem imprevisível, cada uma
 * substituindo um retângulo vazio num piscar — o conjunto dava a impressão de
 * uma página se remontando sozinha. O fade não deixa nada mais rápido, mas
 * transforma um estalo em uma transição, que é o que se lê como fluidez.
 *
 * Imagens que o browser já tem em cache disparam `onLoad` ainda no primeiro
 * quadro, então elas simplesmente não fazem o fade — é o comportamento certo:
 * voltar para uma página já visitada não deve reanimar tudo de novo.
 */
const FadingImage = ({ style, onLoad, ...props }: ImageProps) => {
  const [carregada, setCarregada] = useState(false);

  return (
    // O `alt` chega dentro de `props`, vindo de quem usa o componente; a regra
    // de acessibilidade só reconhece o atributo escrito literalmente aqui.
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      {...props}
      onLoad={(event) => {
        setCarregada(true);
        onLoad?.(event);
      }}
      style={{
        ...style,
        opacity: carregada ? 1 : 0,
        // `opacity` explícito, e não a forma curta: o `style` que vem de fora
        // costuma trazer `transition: ".3s"` para o hover, e animar `all`
        // aqui faria o `objectFit` e o `filter` entrarem na conta.
        transition: [style?.transition, "opacity .35s ease"]
          .filter(Boolean)
          .join(", "),
      }}
    />
  );
};

export default FadingImage;
