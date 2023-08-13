import axios from "axios";

export const apiService = axios.create({
  baseURL: 'https://api.consumet.org/anime/gogoanime'
});
