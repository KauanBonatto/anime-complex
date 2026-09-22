"use client";

import { usePrefetchOnHover } from "@/hooks/usePrefetchOnHover";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type PrefetchLinkProps = ComponentProps<typeof Link> & {
  /** A mesma busca que a tela de destino faria ao montar. */
  carregar: () => Promise<unknown>;
  children: ReactNode;
};

/**
 * `<Link>` que também adianta os dados do destino. Existe como componente
 * porque os links das grades são gerados dentro de um `map`, e um hook não
 * pode ser chamado ali — cada item precisa do próprio.
 */
const PrefetchLink = ({ carregar, children, ...props }: PrefetchLinkProps) => (
  <Link {...props} {...usePrefetchOnHover(carregar)}>
    {children}
  </Link>
);

export default PrefetchLink;
