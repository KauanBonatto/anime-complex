import PageShell from "@/components/PageShell";
import { ReaderSkeleton } from "@/components/Skeletons";

/** Mesmo esqueleto que o leitor mostra enquanto as páginas não chegam. */
const Loading = () => (
  <PageShell loading>
    <ReaderSkeleton />
  </PageShell>
);

export default Loading;
