import PageShell from "@/components/PageShell";
import { SearchSkeleton } from "@/components/Skeletons";

/**
 * O Next mostra isto no instante do clique, antes de baixar o código da tela
 * e antes de a primeira requisição sair. Sem ele, a navegação ficava parada
 * na página anterior até a nova montar: o clique não devolvia nada e a espera
 * se lia como travamento. O desenho é o mesmo esqueleto que a tela usa, para
 * o conteúdo real entrar no lugar sem nada saltar.
 */
const Loading = () => (
  <PageShell loading>
    <SearchSkeleton />
  </PageShell>
);

export default Loading;
