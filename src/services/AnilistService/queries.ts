const ANIME_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  coverImage {
    large
    extraLarge
  }
  bannerImage
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

/**
 * Grade dos próximos lançamentos. A janela é limitada nas duas pontas: o
 * `airingAt_greater` descarta o que já foi ao ar e o `airingAt_lesser` evita
 * arrastar agendamentos de meses à frente, que o calendário da home não mostra.
 */
export const UPCOMING_EPISODES_QUERY = `
  query UpcomingEpisodes($page: Int, $perPage: Int, $from: Int, $until: Int) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      airingSchedules(airingAt_greater: $from, airingAt_lesser: $until, sort: [TIME]) {
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
      externalLinks {
        site
        url
        type
      }
      streamingEpisodes {
        title
        url
        site
        thumbnail
      }
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

const FRANCHISE_FIELDS = `
  id
  type
  title {
    romaji
    english
  }
  coverImage {
    large
  }
  format
  status
  episodes
  seasonYear
  startDate {
    year
  }
`;

const RELATION_IDS = `
  relations {
    edges {
      relationType
      node {
        id
        type
      }
    }
  }
`;

/**
 * Um elo da franquia. No AniList cada temporada é uma obra separada, então a
 * lista de temporadas sai daqui: o nó pedido e os vizinhos dele, já completos
 * e com os IDs dos vizinhos seguintes. Com os dois níveis numa consulta só, o
 * serviço percorre a sequência inteira com cerca de um terço das requisições.
 */
export const FRANCHISE_QUERY = `
  query Franchise($id: Int) {
    Media(id: $id, type: ANIME) {
      ${FRANCHISE_FIELDS}
      relations {
        edges {
          relationType
          node {
            ${FRANCHISE_FIELDS}
            ${RELATION_IDS}
          }
        }
      }
    }
  }
`;
