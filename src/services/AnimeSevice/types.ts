interface ResponseApiProps {
  currentPage: number;
  hasNextPage: boolean;
  results: AnimeProps[];
}

interface AnimeProps {
  id: string;
  episodeId?: string;
  episodeNumber?: number;
  title: string;
  image: string;
  url?: string;
  genres?: string[];
  releaseDate?: string | null;
  subOrDub?: string;
}

interface AnimeGridProps {
  title: string;
  loading: boolean;
  animeData: ResponseApiProps;
  getAnimeData: (pageNumber: number) => Promise<void>;
}

interface AnimeEpisodeProps {
  id: string;
  number: number,
  url: string;    
}

interface AnimeInfoProps {
  id: string;
  title: string;
  url: string;
  image: string;
  releaseDate: string | null;
  description: string | null;
  genres: string[];
  subOrDub: string;
  type: string | null;
  status: string;
  otherName: string | null;
  totalEpisodes: number;
  episodes: AnimeEpisodeProps[];
}

interface AnimeEpisodeInfoProps {
  headers: {
    Referer: string;
  };
  sources: [
    {
      url: string;
      quality: string;
      isM3U8: true;
    }
  ];
}