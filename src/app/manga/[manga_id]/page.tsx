import MangaInfoView from "@/views/manga/info";

const MangaInfo = ({ params }: { params: { manga_id: string } }) => (
  <MangaInfoView params={params} />
);

export default MangaInfo;
