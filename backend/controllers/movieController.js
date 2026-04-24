const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Movie = require("../models/Movie");
const { makeStreamUrl } = require("../utils/streamToken");
const { generateVideoBackdrop } = require("../utils/generateVideoBackdrop");

// ==========================
// HELPERS
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

const LIST_PROJECTION = [
  "title",
  "slug",
  "poster",
  "backdrop",
  "genre",
  "year",
  "rating",
  "duration",
  "trailerUrl",
  "type",
  "featured",
  "newPopular",
  "views",
  "language",
  "country",
  "previewTimeline",
  "createdAt",
  "updatedAt",
].join(" ");

const PUBLIC_DETAIL_PROJECTION = [
  "title",
  "slug",
  "description",
  "poster",
  "backdrop",
  "genre",
  "year",
  "rating",
  "duration",
  "trailerUrl",
  "type",
  "featured",
  "newPopular",
  "views",
  "cast",
  "director",
  "language",
  "country",
  "subtitles",
  "thumbnailPickedAt",
  "previewTimeline",
  "createdAt",
  "updatedAt",
].join(" ");

const ADMIN_DETAIL_PROJECTION = [
  PUBLIC_DETAIL_PROJECTION,
  "hlsUrl",
  "status",
  "processingError",
].join(" ");

const setPublicCache = (
  res,
  value = "public, max-age=60, s-maxage=180, stale-while-revalidate=300"
) => {
  res.set("Cache-Control", value);
};

const setNoStore = (res) => {
  res.set("Cache-Control", "private, no-store");
};

const cleanString = (value = "") =>
  typeof value === "string" ? value.trim() : "";

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeImage = (value = "") => {
  const next = cleanString(value);
  return next || "";
};

// ==========================
// GET MOVIES
// ==========================
const getMovies = async (req, res) => {
  try {
    setPublicCache(
      res,
      "public, max-age=60, s-maxage=120, stale-while-revalidate=300"
    );

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

    const query = cleanString(q).slice(0, 80);
    if (query) {
      const pattern = escapeRegex(query);

      filter.$or = [
        { title: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 48);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Movie.find(filter)
        .select(LIST_PROJECTION)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
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
    setPublicCache(res);

    const { limit = 30 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 48);

    const items = await Movie.find({ isPublished: true })
      .select(LIST_PROJECTION)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limitNum)
      .lean();

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
    setPublicCache(res);

    const { limit = 30 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 48);

    const items = await Movie.find({ isPublished: true })
      .select(LIST_PROJECTION)
      .sort({ views: -1, updatedAt: -1, createdAt: -1 })
      .limit(limitNum)
      .lean();

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
// GET GENRES
// ==========================
const getGenres = async (req, res) => {
  try {
    setPublicCache(
      res,
      "public, max-age=300, s-maxage=600, stale-while-revalidate=1200"
    );

    const movies = await Movie.find({ isPublished: true }).select("genre").lean();
    const genreSet = new Set();

    for (const movie of movies) {
      for (const g of movie.genre || []) {
        const value = String(g || "").trim();
        if (value) genreSet.add(value);
      }
    }

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
// GET MOVIE BY ID OR SLUG
// ==========================
const getMovieById = async (req, res) => {
  try {
    setPublicCache(
      res,
      "public, max-age=60, s-maxage=120, stale-while-revalidate=300"
    );

    const { id } = req.params;

    const orConditions = [{ slug: id, isPublished: true }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      orConditions.push({ _id: id, isPublished: true });
    }

    const movie = await Movie.findOne({ $or: orConditions })
      .select(req.user?.isAdmin ? ADMIN_DETAIL_PROJECTION : PUBLIC_DETAIL_PROJECTION)
      .lean();

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
  let tempVideoPath = "";

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
      payload.genre = payload.genre.split(",").map((x) => x.trim()).filter(Boolean);
    }

    if (typeof payload.cast === "string") {
      payload.cast = payload.cast.split(",").map((x) => x.trim()).filter(Boolean);
    }

    if (typeof payload.subtitles === "string") {
      payload.subtitles = payload.subtitles
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }

    payload.poster = normalizeImage(payload.poster);
    payload.backdrop = normalizeImage(payload.backdrop);

    const existed = await Movie.findOne({ slug: payload.slug }).lean();
    if (existed) {
      payload.slug = `${payload.slug}-${Date.now()}`;
    }

    const videoFile = req.files?.video;

    if (videoFile) {
      const tempDir = path.join(process.cwd(), "tmp", "uploads");

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const ext = path.extname(videoFile.name || ".mp4");
      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
      tempVideoPath = path.join(tempDir, fileName);

      await videoFile.mv(tempVideoPath);

      // Chỉ auto generate backdrop khi chưa có backdrop do admin/user nhập tay
      if (!payload.backdrop) {
        try {
          const generated = await generateVideoBackdrop(tempVideoPath, payload.slug);
          if (generated?.backdropUrl) {
            payload.backdrop = generated.backdropUrl;
            if (generated?.capturedAt?.[1] != null) {
              payload.thumbnailPickedAt = generated.capturedAt[1];
            }
          }
        } catch (backdropErr) {
          console.error("generate backdrop failed:", backdropErr);
        }
      }
    }

    const movie = await Movie.create(payload);

    if (tempVideoPath) {
      try {
        await fsp.unlink(tempVideoPath);
      } catch (_) {}
    }

    return res.status(201).json({
      success: true,
      movie,
    });
  } catch (err) {
    console.error("createMovie error:", err);

    if (tempVideoPath) {
      try {
        await fsp.unlink(tempVideoPath);
      } catch (_) {}
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// UPDATE MOVIE
// ==========================
const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

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

    if (payload.title && !payload.slug) {
      payload.slug = createSlug(payload.title);
    }

    if (typeof payload.genre === "string") {
      payload.genre = payload.genre.split(",").map((x) => x.trim()).filter(Boolean);
    }

    if (typeof payload.cast === "string") {
      payload.cast = payload.cast.split(",").map((x) => x.trim()).filter(Boolean);
    }

    if (typeof payload.subtitles === "string") {
      payload.subtitles = payload.subtitles
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }

    if (payload.poster !== undefined) {
      payload.poster = normalizeImage(payload.poster);
    }

    if (payload.backdrop !== undefined) {
      payload.backdrop = normalizeImage(payload.backdrop);
    }

    if (payload.slug) {
      const existed = await Movie.findOne({
        slug: payload.slug,
        _id: { $ne: id },
      }).lean();

      if (existed) {
        payload.slug = `${payload.slug}-${Date.now()}`;
      }
    }

    const updatedMovie = await Movie.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    return res.json({
      success: true,
      movie: updatedMovie,
    });
  } catch (err) {
    console.error("updateMovie error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// DELETE MOVIE
// ==========================
const deleteMovie = async (req, res) => {
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

    await Movie.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Movie deleted successfully",
    });
  } catch (err) {
    console.error("deleteMovie error:", err);
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
    setNoStore(res);

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const filter = { _id: id };
    if (!req.user?.isAdmin) {
      filter.isPublished = true;
    }

    const movie = await Movie.findOne(filter).select("_id");

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
    setPublicCache(
      res,
      "public, max-age=60, s-maxage=180, stale-while-revalidate=300"
    );

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const movie = await Movie.findOne({ _id: id, isPublished: true }).select("genre");

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
      .select(LIST_PROJECTION)
      .sort({ views: -1, createdAt: -1 })
      .limit(12)
      .lean();

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
    setNoStore(res);

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const updated = await Movie.findOneAndUpdate(
      { _id: id, isPublished: true },
      { $inc: { views: 1 } },
      { new: true }
    ).select("views");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.json({
      success: true,
      views: updated.views,
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
    setPublicCache(
      res,
      "public, max-age=60, s-maxage=180, stale-while-revalidate=300"
    );

    const movies = await Movie.find({ isPublished: true })
      .select(LIST_PROJECTION)
      .sort({ views: -1, createdAt: -1 })
      .limit(10)
      .lean();

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
  updateMovie,
  deleteMovie,
  getStreamUrl,
  getRelatedMovies,
  incrementView,
  getTrending,
};
