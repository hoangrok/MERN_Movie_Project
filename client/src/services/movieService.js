import http from "./baseHTTP";

export const fetchMoviesAPI = (params = {}) => http.get("/movies", { params });
export const fetchMovieByIdAPI = (id) => http.get(`/movies/${id}`);