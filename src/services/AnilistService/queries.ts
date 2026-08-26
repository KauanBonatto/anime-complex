const ANIME_FIELDS = `
  id
  idMal
  title {
    romaji
    english
  }
  coverImage {
    large
    extraLarge
  }
  averageScore
  popularity
  favourites
  genres
  format
  status
  episodes
  startDate {
    year
    month
    day
  }
`;

const PAGE_INFO = `
  pageInfo {
    currentPage
    hasNextPage
  }
`;

export const POPULAR_ANIME_QUERY = `
  query PopularAnime($page: Int, $perPage: Int, $genres: [String]) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(type: ANIME, isAdult: false, genre_in: $genres, sort: [POPULARITY_DESC]) {
        ${ANIME_FIELDS}
      }
    }
  }
`;

export const RECENT_EPISODES_QUERY = `
  query RecentEpisodes($page: Int, $perPage: Int, $airingAt: Int) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      airingSchedules(airingAt_lesser: $airingAt, sort: [TIME_DESC]) {
        episode
        airingAt
        media {
          ${ANIME_FIELDS}
          isAdult
        }
      }
    }
  }
`;

export const RECENT_ANIME_QUERY = `
  query RecentAnime($page: Int, $perPage: Int, $genres: [String]) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(
        type: ANIME
        isAdult: false
        genre_in: $genres
        status_in: [RELEASING]
        sort: [POPULARITY_DESC]
      ) {
        ${ANIME_FIELDS}
      }
    }
  }
`;

export const SEARCH_ANIME_QUERY = `
  query SearchAnime($page: Int, $perPage: Int, $search: String, $genres: [String]) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(
        type: ANIME
        isAdult: false
        search: $search
        genre_in: $genres
        sort: [POPULARITY_DESC]
      ) {
        ${ANIME_FIELDS}
      }
    }
  }
`;

export const ANIME_DETAILS_QUERY = `
  query AnimeDetails($id: Int) {
    Media(id: $id, type: ANIME) {
      ${ANIME_FIELDS}
      bannerImage
      duration
      trailer {
        id
        site
        thumbnail
      }
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
      season
      seasonYear
      siteUrl
      description(asHtml: false)
      studios(isMain: true) {
        nodes {
          name
        }
      }
      rankings {
        rank
        type
        context
        allTime
      }
    }
  }
`;
