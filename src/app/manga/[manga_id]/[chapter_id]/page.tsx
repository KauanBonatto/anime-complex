import MangaReaderView from "@/views/manga/reader";

const MangaChapter = ({
  params,
}: {
  params: { manga_id: string; chapter_id: string };
}) => <MangaReaderView params={params} />;

export default MangaChapter;
