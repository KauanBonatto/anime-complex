const MANGA_FIELDS = `
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
  chapters
  volumes
  startDate {
    year
  }
`;

const PAGE_INFO = `
  pageInfo {
    currentPage
    hasNextPage
  }
`;

export const POPULAR_MANGA_QUERY = `
  query PopularManga($page: Int, $perPage: Int, $genres: [String]) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(type: MANGA, isAdult: false, genre_in: $genres, sort: [POPULARITY_DESC]) {
        ${MANGA_FIELDS}
      }
    }
  }
`;

export const TOP_RATED_MANGA_QUERY = `
  query TopRatedManga($page: Int, $perPage: Int, $genres: [String]) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(type: MANGA, isAdult: false, genre_in: $genres, sort: [SCORE_DESC]) {
        ${MANGA_FIELDS}
      }
    }
  }
`;

/**
 * Lançamentos: obras em publicação que começaram dentro da janela recente.
 * Ordenar puramente por data de início encheria a lista de títulos obscuros
 * cadastrados ontem, então a popularidade decide a ordem dentro da janela.
 */
export const RECENT_MANGA_QUERY = `
  query RecentManga($page: Int, $perPage: Int, $genres: [String], $startDate: FuzzyDateInt) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(
        type: MANGA
        isAdult: false
        genre_in: $genres
        status_in: [RELEASING]
        startDate_greater: $startDate
        sort: [POPULARITY_DESC]
      ) {
        ${MANGA_FIELDS}
      }
    }
  }
`;

export const SEARCH_MANGA_QUERY = `
  query SearchManga($page: Int, $perPage: Int, $search: String, $genres: [String]) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(
        type: MANGA
        isAdult: false
        search: $search
        genre_in: $genres
        sort: [POPULARITY_DESC]
      ) {
        ${MANGA_FIELDS}
      }
    }
  }
`;

export const MANGA_DETAILS_QUERY = `
  query MangaDetails($id: Int) {
    Media(id: $id, type: MANGA) {
      ${MANGA_FIELDS}
      bannerImage
      siteUrl
      description(asHtml: false)
      endDate {
        year
      }
      rankings {
        rank
        type
        context
        allTime
      }
      staff(perPage: 4, sort: [RELEVANCE]) {
        edges {
          role
          node {
            name {
              full
            }
          }
        }
      }
    }
  }
`;
