/**
 * Versão translúcida de uma cor do tema, a partir do canal ("r g b") dela.
 *
 * Existe para substituir `alpha(theme.palette.x, n)` nos tokens que mudam
 * entre claro e escuro. O `alpha` resolve o valor na hora de gerar o estilo,
 * então grava o hex do esquema na classe do Emotion: o servidor renderiza com
 * o esquema padrão, o cliente com o esquema real, e a hidratação diverge. A
 * variável CSS é a mesma string nos dois, e quem troca de cor é o próprio CSS.
 *
 * Para cores idênticas nos dois esquemas (`brand.scrim`, `common.white`) o
 * `alpha` continua correto e mais legível — não há o que divergir.
 */
export const translucent = (channel: string, opacity: number) =>
  `rgba(${channel} / ${opacity})`;
