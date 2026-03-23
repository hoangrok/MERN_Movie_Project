const mongoose = require("mongoose");
const Movie = require("../models/Movie");
const { makeStreamUrl } = require("../utils/streamToken");

// ==========================
// HELPER: CREATE SLUG
// ==========================
const createSlug = (text = "") => {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

// ==========================
// GET MOVIES
// ==========================
const getMovies = async (req, res) => {
  try {
    const { q, genre, limit = 24, page = 1 } = req.query;

    const filter = { isPublished: true };

    if (genre) {
      const genreList = String(genre)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      if (genreList.length === 1) {
        filter.genre = genreList[0];
      } else if (genreList.length > 1) {
        filter.genre = { $in: genreList };
      }
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Movie.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Movie.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("getMovies error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// GET LATEST MOVIES
// ==========================
const getLatestMovies = async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);

    const items = await Movie.find({ isPublished: true })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limitNum);

    return res.json({
      success: true,
      items,
    });
  } catch (err) {
    console.error("getLatestMovies error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// GET TOP VIEWED MOVIES
// ==========================
const getTopViewedMovies = async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);

    const items = await Movie.find({ isPublished: true })
      .sort({ views: -1, updatedAt: -1, createdAt: -1 })
      .limit(limitNum);

    return res.json({
      success: true,
      items,
    });
  } catch (err) {
    console.error("getTopViewedMovies error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// GET GENRES FROM DB
// ==========================
const getGenres = async (req, res) => {
  try {
    const movies = await Movie.find({ isPublished: true }).select("genre");
    const genreSet = new Set();

    movies.forEach((movie) => {
      (movie.genre || []).forEach((g) => {
        const value = String(g || "").trim();
        if (value) genreSet.add(value);
      });
    });

    return res.json({
      success: true,
      items: [...genreSet].sort((a, b) => a.localeCompare(b)),
    });
  } catch (err) {
    console.error("getGenres error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// GET MOVIE BY ID
// ==========================
const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.json({
      success: true,
      movie,
    });
  } catch (err) {
    console.error("getMovieById error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// CREATE MOVIE
// ==========================
const createMovie = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (!payload.title || !payload.title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!payload.slug || !payload.slug.trim()) {
      payload.slug = createSlug(payload.title);
    }

    if (typeof payload.genre === "string") {
      payload.genre = payload.genre
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }

    const existed = await Movie.findOne({ slug: payload.slug });
    if (existed) {
      payload.slug = `${payload.slug}-${Date.now()}`;
    }

    const movie = await Movie.create(payload);

    return res.status(201).json({
      success: true,
      movie,
    });
  } catch (err) {
    console.error("createMovie error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// STREAM URL
// ==========================
const getStreamUrl = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const baseUrl = process.env.STREAM_BASE_URL;
    const secret = process.env.STREAM_TOKEN_SECRET;

    if (!baseUrl) {
      return res.status(500).json({
        success: false,
        message: "STREAM_BASE_URL is missing",
      });
    }

    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "STREAM_TOKEN_SECRET is missing",
      });
    }

    const cleanBase = baseUrl.replace(/\/+$/, "");
    const hlsUrl = `${cleanBase}/videos/${movie._id.toString()}/hls/master.m3u8`;

    const signedUrl = makeStreamUrl(
      hlsUrl,
      movie._id.toString(),
      secret,
      60 * 60 * 12
    );

    return res.json({
      success: true,
      signedUrl,
    });
  } catch (err) {
    console.error("getStreamUrl error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// RELATED MOVIES
// ==========================
const getRelatedMovies = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const firstGenre = movie.genre?.[0];

    const related = await Movie.find({
      _id: { $ne: movie._id },
      isPublished: true,
      ...(firstGenre ? { genre: firstGenre } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(12);

    return res.json({
      success: true,
      items: related,
    });
  } catch (err) {
    console.error("getRelatedMovies error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// INCREMENT VIEW
// ==========================
const incrementView = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    movie.views = (movie.views || 0) + 1;
    await movie.save();

    return res.json({
      success: true,
      views: movie.views,
    });
  } catch (err) {
    console.error("incrementView error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// TRENDING
// ==========================
const getTrending = async (req, res) => {
  try {
    const movies = await Movie.find({ isPublished: true })
      .sort({ views: -1, createdAt: -1 })
      .limit(10);

    return res.json({
      success: true,
      items: movies,
    });
  } catch (err) {
    console.error("getTrending error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getMovies,
  getLatestMovies,
  getTopViewedMovies,
  getGenres,
  getMovieById,
  createMovie,
  getStreamUrl,
  getRelatedMovies,
  incrementView,
  getTrending,
};