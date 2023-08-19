import AnimeEpisodeView from "@/views/anime/episode";

const AnimeEpisode = ({
  params,
}: {
  params: { anime_id: string; episode_id: string };
}) => <AnimeEpisodeView params={params} />;

export default AnimeEpisode;
