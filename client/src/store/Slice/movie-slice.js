// src/store/Slice/movie-slice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ============================
// Base API URL
// ============================
const API_BASE = import.meta.env.VITE_API_BASE_URL;

console.log("API_BASE:", API_BASE);

// ============================
// Async Thunks
// ============================

// 1️⃣ Lấy tất cả movies
export const fetchMovies = createAsyncThunk(
  "movie/fetchMovies",
  async ({ type }, thunkAPI) => {
    try {
      const res = await axios.get(`${API_BASE}/api/movies?type=${type}`);
      return res.data.items || [];
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Fetch movies failed"
      );
    }
  }
);

// 2️⃣ Lấy movies theo genre
export const fetchMoviesWithGenre = createAsyncThunk(
  "movie/fetchMoviesWithGenre",
  async ({ type, genre }, thunkAPI) => {
    try {
      const res = await axios.get(
        `${API_BASE}/api/movies?type=${type}&genre=${genre}`
      );
      return res.data.items || [];
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Fetch movies with genre failed"
      );
    }
  }
);

// 3️⃣ Tìm kiếm movies
export const searchMovies = createAsyncThunk(
  "movie/searchMovies",
  async ({ query }, thunkAPI) => {
    try {
      const res = await axios.get(`${API_BASE}/api/movies?q=${query}&limit=12`);
      return res.data.items || [];
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Search movies failed"
      );
    }
  }
);

// 4️⃣ Lấy chi tiết movie theo ID
export const fetchMovieById = createAsyncThunk(
  "movie/fetchMovieById",
  async (id, thunkAPI) => {
    try {
      const res = await axios.get(`${API_BASE}/api/movies/${id}`);
      return res.data.movie;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Fetch movie by ID failed"
      );
    }
  }
);

// 5️⃣ Lấy trending top 10
export const getTrending = createAsyncThunk(
  "movie/getTrending",
  async (_, thunkAPI) => {
    try {
      const res = await axios.get(`${API_BASE}/api/movies/trending`);
      return res.data.items || [];
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Fetch trending movies failed"
      );
    }
  }
);

// ============================
// Slice
// ============================
const movieSlice = createSlice({
  name: "movie",
  initialState: {
    movies: [],
    trending: [],
    searchedMovies: [],
    current: null,
    likedMovies: [],
    status: "idle",
    error: null,
  },
  reducers: {
    clearCurrentMovie(state) {
      state.current = null;
    },
    clearSearch(state) {
      state.searchedMovies = [];
    },
    addLikedMovie(state, action) {
      state.likedMovies.push(action.payload);
    },
    removeLikedMovie(state, action) {
      state.likedMovies = state.likedMovies.filter(
        (m) => m._id !== action.payload.movie._id
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMovies
      .addCase(fetchMovies.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMovies.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.movies = action.payload;
      })
      .addCase(fetchMovies.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // fetchMoviesWithGenre
      .addCase(fetchMoviesWithGenre.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMoviesWithGenre.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.movies = action.payload;
      })
      .addCase(fetchMoviesWithGenre.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // searchMovies
      .addCase(searchMovies.pending, (state) => {
        state.status = "loading";
      })
      .addCase(searchMovies.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.searchedMovies = action.payload;
      })
      .addCase(searchMovies.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // fetchMovieById
      .addCase(fetchMovieById.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMovieById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.current = action.payload;
      })
      .addCase(fetchMovieById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // getTrending
      .addCase(getTrending.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getTrending.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.trending = action.payload;
      })
      .addCase(getTrending.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

// ============================
// Exports
// ============================
export const {
  clearCurrentMovie,
  clearSearch,
  addLikedMovie,
  removeLikedMovie,
} = movieSlice.actions;

export default movieSlice.reducer;