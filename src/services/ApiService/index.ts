import axios from "axios";

export const apiService = axios.create({
    baseURL: 'https://api-consumet-org-lyart.vercel.app/anime/gogoanime'
    // baseURL: 'https://consumet-api-eta-three.vercel.app/anime/gogoanime'
    // baseURL: 'https://api.consumet.org/anime/gogoanime'
});
