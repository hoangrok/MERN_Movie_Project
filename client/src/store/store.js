import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./Slice/auth-slice";
import movieReducer from "./Slice/movie-slice";
import { createAsyncThunk, createSlice, createAction } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    movie: movieReducer, // QUAN TRỌNG: Home đang useSelector(state => state.movie.xxx)
  },
});