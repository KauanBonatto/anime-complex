import AnimeInfoView from "@/views/anime/info";

const AnimeInfo = ({ params }: { params: { anime_id: string } }) => (
  <AnimeInfoView params={params} />
);

export default AnimeInfo;
