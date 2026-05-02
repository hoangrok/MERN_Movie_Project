const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Movie = require("../models/Movie");
const User = require("../models/UserModel");
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

// Accept both MongoDB ObjectId and slug string
const buildIdOrSlugFilter = (id, extra = {}) => {
  const conditions = [{ slug: id, ...extra }];
  if (mongoose.Types.ObjectId.isValid(id)) {
    conditions.push({ _id: id, ...extra });
  }
  return { $or: conditions };
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
  "videoWidth",
  "videoHeight",
  "trailerUrl",
  "type",
  "contentArea",
  "seriesId",
  "seriesTitle",
  "season",
  "episode",
  "episodeLabel",
  "episodeTitle",
  "featured",
  "newPopular",
  "views",
  "language",
  "country",
  "images",
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
  "videoWidth",
  "videoHeight",
  "trailerUrl",
  "type",
  "contentArea",
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
  "images",
  "seriesId",
  "seriesTitle",
  "season",
  "episode",
  "episodeLabel",
  "episodeTitle",
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

const resolveContentAreaFilter = (area, { fallback = "default" } = {}) => {
  const current = cleanString(area).toLowerCase();

  if (current === "all") return {};
  if (current === "world") return { contentArea: "world" };
  if (current === "default") return { contentArea: { $ne: "world" } };

  return fallback === "all" ? {} : { contentArea: { $ne: "world" } };
};

const pickEvenly = (items = [], limit = 10) => {
  if (!Array.isArray(items) || items.length <= limit) return items;

  return Array.from({ length: limit }, (_item, index) => {
    const ratio = index / Math.max(1, limit - 1);
    const itemIndex = Math.min(
      items.length - 1,
      Math.round((items.length - 1) * ratio)
    );
    return items[itemIndex];
  });
};

const compactListMovie = (movie) => {
  const items = movie?.previewTimeline?.items;
  if (!Array.isArray(items) || items.length <= 10) return movie;

  return {
    ...movie,
    previewTimeline: {
      ...movie.previewTimeline,
      items: pickEvenly(items, 10),
      totalItems: items.length,
    },
  };
};

const compactListMovies = (items = []) => items.map(compactListMovie);

// Keep only the first-encountered episode per seriesId, let standalone movies through
const deduplicateBySeries = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.seriesId) return true;
    if (seen.has(item.seriesId)) return false;
    seen.add(item.seriesId);
    return true;
  });
};

// ==========================
// GET MOVIES
// ==========================
const getMovies = async (req, res) => {
  try {
    setPublicCache(res, "public, max-age=30, s-maxage=120, stale-while-revalidate=300");

    const { q, genre, limit = 24, page = 1, area } = req.query;
    const includeTotal = req.query.includeTotal !== "false";

    const fallbackArea = cleanString(q) ? "all" : "default";
    const filter = {
      isPublished: true,
      ...resolveContentAreaFilter(area, { fallback: fallbackArea }),
    };

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

    // Group by seriesId so each series shows as one card (most recent episode first)
    const groupKey = {
      $cond: [{ $gt: ["$seriesId", ""] }, "$seriesId", { $toString: "$_id" }],
    };

    const selectFields = LIST_PROJECTION.split(" ").reduce((acc, f) => {
      acc[f] = 1;
      return acc;
    }, {});

    const [items, totalResult] = await Promise.all([
      Movie.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $group: { _id: groupKey, doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        { $project: selectFields },
      ]),
      includeTotal
        ? Movie.aggregate([
            { $match: filter },
            { $group: { _id: groupKey } },
            { $count: "total" },
          ])
        : Promise.resolve([{ total: 0 }]),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return res.json({
      success: true,
      items: compactListMovies(items),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: includeTotal ? Math.ceil(total / limitNum) : 0,
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
    setPublicCache(res, "public, max-age=30, s-maxage=120, stale-while-revalidate=300");

    const { limit = 30, area } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 48);

    const items = await Movie.find({
      isPublished: true,
      ...resolveContentAreaFilter(area),
    })
      .select(LIST_PROJECTION)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limitNum)
      .lean();

    return res.json({
      success: true,
      items: compactListMovies(deduplicateBySeries(items)),
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
    setPublicCache(res, "public, max-age=30, s-maxage=120, stale-while-revalidate=300");

    const { limit = 30, area } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 48);

    const items = await Movie.find({
      isPublished: true,
      ...resolveContentAreaFilter(area),
    })
      .select(LIST_PROJECTION)
      .sort({ views: -1, updatedAt: -1, createdAt: -1 })
      .limit(limitNum)
      .lean();

    return res.json({
      success: true,
      items: compactListMovies(deduplicateBySeries(items)),
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

    const movies = await Movie.find({
      isPublished: true,
      ...resolveContentAreaFilter(req.query.area),
    }).select("genre").lean();
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
    setNoStore(res);

    const { id } = req.params;

    const extra = req.user?.isAdmin ? {} : { isPublished: true };

    const movie = await Movie.findOne(buildIdOrSlugFilter(id, extra))
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
// VALIDATE MOVIE IDS
// ==========================
const validateMovieIds = async (req, res) => {
  try {
    setNoStore(res);

    const ids = [
      ...new Set(
        String(req.query.ids || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      ),
    ]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .slice(0, 100);

    if (ids.length === 0) {
      return res.json({
        success: true,
        validIds: [],
      });
    }

    const movies = await Movie.find({
      _id: { $in: ids },
      isPublished: true,
    })
      .select("_id")
      .lean();

    return res.json({
      success: true,
      validIds: movies.map((movie) => movie._id.toString()),
    });
  } catch (err) {
    console.error("validateMovieIds error:", err);
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

    if (payload.seriesId !== undefined) {
      payload.seriesId = cleanString(payload.seriesId);
    }

    if (payload.seriesTitle !== undefined) {
      payload.seriesTitle = cleanString(payload.seriesTitle);
    }

    if (payload.episodeLabel !== undefined) {
      payload.episodeLabel = cleanString(payload.episodeLabel);
    }

    if (payload.episodeTitle !== undefined) {
      payload.episodeTitle = cleanString(payload.episodeTitle);
    }

    if (payload.contentArea !== undefined) {
      payload.contentArea =
        cleanString(payload.contentArea).toLowerCase() === "world"
          ? "world"
          : "default";
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

    if (payload.seriesId !== undefined) {
      payload.seriesId = cleanString(payload.seriesId);
    }

    if (payload.seriesTitle !== undefined) {
      payload.seriesTitle = cleanString(payload.seriesTitle);
    }

    if (payload.episodeLabel !== undefined) {
      payload.episodeLabel = cleanString(payload.episodeLabel);
    }

    if (payload.episodeTitle !== undefined) {
      payload.episodeTitle = cleanString(payload.episodeTitle);
    }

    if (payload.contentArea !== undefined) {
      payload.contentArea =
        cleanString(payload.contentArea).toLowerCase() === "world"
          ? "world"
          : "default";
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

    try {
      const idVariants = [id, movie._id, movie._id.toString()];
      await User.updateMany(
        {},
        { $pull: { likedMovies: { id: { $in: idVariants } } } }
      );
      await User.updateMany(
        {},
        { $pull: { likedMovies: { _id: { $in: idVariants } } } }
      );
      await User.updateMany(
        {},
        { $pull: { likedMovies: { $in: idVariants } } }
      );
    } catch (cleanupErr) {
      console.error("deleteMovie liked cleanup error:", cleanupErr);
    }

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

    const extra = req.user?.isAdmin ? {} : { isPublished: true };
    const movie = await Movie.findOne(buildIdOrSlugFilter(id, extra)).select("_id");

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
    setNoStore(res);

    const { id } = req.params;

    const movie = await Movie.findOne(buildIdOrSlugFilter(id, { isPublished: true })).select("_id genre seriesId contentArea");

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const firstGenre = movie.genre?.[0];

    // Exclude the current movie; also exclude all episodes of the same series
    const exclusions = [{ _id: movie._id }];
    if (movie.seriesId) exclusions.push({ seriesId: movie.seriesId });

    const related = await Movie.find({
      $nor: exclusions,
      isPublished: true,
      ...resolveContentAreaFilter(movie.contentArea || "default"),
      ...(firstGenre ? { genre: firstGenre } : {}),
    })
      .select(LIST_PROJECTION)
      .sort({ views: -1, createdAt: -1 })
      .limit(12)
      .lean();

    return res.json({
      success: true,
      items: compactListMovies(deduplicateBySeries(related)),
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

    const filter = buildIdOrSlugFilter(id, { isPublished: true });
    const updated = await Movie.findOneAndUpdate(
      filter,
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
    setPublicCache(res, "public, max-age=30, s-maxage=120, stale-while-revalidate=300");

    const movies = await Movie.find({
      isPublished: true,
      ...resolveContentAreaFilter(req.query.area),
    })
      .select(LIST_PROJECTION)
      .sort({ views: -1, createdAt: -1 })
      .limit(10)
      .lean();

    return res.json({
      success: true,
      items: compactListMovies(deduplicateBySeries(movies)),
    });
  } catch (err) {
    console.error("getTrending error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// GET SERIES EPISODES
// ==========================
const getSeriesEpisodes = async (req, res) => {
  try {
    setPublicCache(res);
    const { seriesId } = req.params;

    if (!seriesId || !seriesId.trim()) {
      return res.status(400).json({ success: false, message: "seriesId is required" });
    }

    const episodes = await Movie.find({ seriesId: seriesId.trim(), isPublished: true })
      .select(
        "title slug poster backdrop season episode episodeLabel episodeTitle duration views images videoWidth videoHeight previewTimeline"
      )
      .sort({ season: 1, episode: 1 })
      .lean();

    return res.json({ success: true, episodes });
  } catch (err) {
    console.error("getSeriesEpisodes error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getMovies,
  getLatestMovies,
  getTopViewedMovies,
  getGenres,
  getMovieById,
  validateMovieIds,
  createMovie,
  updateMovie,
  deleteMovie,
  getStreamUrl,
  getRelatedMovies,
  incrementView,
  getTrending,
  getSeriesEpisodes,
};
