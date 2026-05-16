const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Movie = require("../models/Movie");
const User = require("../models/UserModel");
const Progress = require("../models/Progress");
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

const normalizeSearchText = (value = "") =>
  cleanString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Build a regex pattern that matches both accented and non-accented Vietnamese
const buildVietnamesePattern = (text = "") => {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const map = {
    a: "aàáảãạăằắẳẵặâầấẩẫậ",
    d: "dđ",
    e: "eèéẻẽẹêềếểễệ",
    i: "iìíỉĩị",
    o: "oòóỏõọôồốổỗộơờớởỡợ",
    u: "uùúủũụưừứửữự",
    y: "yỳýỷỹỵ",
  };
  return normalized
    .split("")
    .map((c) => {
      const variants = map[c];
      return variants ? `[${variants}]` : escapeRegex(c);
    })
    .join("");
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

const levenshteinDistance = (source = "", target = "") => {
  const a = normalizeSearchText(source);
  const b = normalizeSearchText(target);

  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_item, index) => index);
  const current = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
};

const similarityScore = (source = "", target = "") => {
  const a = normalizeSearchText(source);
  const b = normalizeSearchText(target);
  if (!a || !b) return 0;

  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }

  const distance = levenshteinDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length, 1);
};

const tokenizeSearchText = (value = "") =>
  normalizeSearchText(value)
    .split(/[^a-z0-9]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

const buildFuzzySearchSuggestions = async (query, options = {}) => {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenizeSearchText(query);

  if (!normalizedQuery) {
    return { didYouMean: "", suggestions: [] };
  }

  const sampleItems = await Movie.find({
    isPublished: true,
    ...resolveContentAreaFilter(options.area || "all", { fallback: "all" }),
  })
    .select("title seriesTitle episodeTitle genre country")
    .sort({ updatedAt: -1, views: -1, createdAt: -1 })
    .limit(180)
    .lean();

  const suggestionMap = new Map();

  sampleItems.forEach((movie) => {
    const candidates = [
      movie.title,
      movie.seriesTitle,
      movie.episodeTitle,
      movie.country,
      ...(Array.isArray(movie.genre) ? movie.genre : []),
    ]
      .map((item) => cleanString(item))
      .filter(Boolean);

    candidates.forEach((candidate) => {
      const key = normalizeSearchText(candidate);
      if (!key || key.length < 2 || suggestionMap.has(key)) return;
      suggestionMap.set(key, candidate);
    });
  });

  const scored = Array.from(suggestionMap.values())
    .map((candidate) => {
      const normalizedCandidate = normalizeSearchText(candidate);
      const candidateTokens = tokenizeSearchText(candidate);
      const baseScore = similarityScore(normalizedQuery, normalizedCandidate);
      const tokenBoost = queryTokens.some((token) =>
        candidateTokens.some(
          (candidateToken) =>
            candidateToken.includes(token) ||
            token.includes(candidateToken) ||
            similarityScore(token, candidateToken) >= 0.68
        )
      )
        ? 0.16
        : 0;
      const prefixBoost =
        normalizedCandidate.startsWith(normalizedQuery) ||
        normalizedQuery.startsWith(normalizedCandidate)
          ? 0.12
          : 0;

      return {
        value: candidate,
        score: baseScore + tokenBoost + prefixBoost,
      };
    })
    .filter((item) => item.score >= 0.48)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    didYouMean: scored[0]?.value || "",
    suggestions: scored.map((item) => item.value),
  };
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
      const pattern = buildVietnamesePattern(query);
      filter.$or = [
        { title: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
        { seriesTitle: { $regex: pattern, $options: "i" } },
        { episodeTitle: { $regex: pattern, $options: "i" } },
        { genre: { $regex: pattern, $options: "i" } },
        { country: { $regex: pattern, $options: "i" } },
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

    const [items, totalResult, searchSuggestions] = await Promise.all([
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
      query
        ? buildFuzzySearchSuggestions(query, {
            area: area || fallbackArea,
          })
        : Promise.resolve({ didYouMean: "", suggestions: [] }),
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
      searchMeta: query
        ? {
            query,
            normalizedQuery: normalizeSearchText(query),
            didYouMean:
              total === 0 ||
              normalizeSearchText(searchSuggestions.didYouMean) !==
                normalizeSearchText(query)
                ? searchSuggestions.didYouMean
                : "",
            suggestions: (searchSuggestions.suggestions || []).filter(
              (item) => normalizeSearchText(item) !== normalizeSearchText(query)
            ),
          }
        : undefined,
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
          const generated = await generateVideoBackdrop(tempVideoPath, payload.slug, {
            genres: payload.genre || [],
          });
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

const getSuggestions = async (req, res) => {
  try {
    const q = cleanString(req.query.q);
    if (!q || q.length < 2) {
      return res.json({ success: true, movies: [], keywords: [] });
    }

    const userId = req.user?._id;
    if (userId) {
      setNoStore(res);
    } else {
      setPublicCache(res, "public, max-age=10, s-maxage=30");
    }

    const pattern = buildVietnamesePattern(q.slice(0, 50));

    const raw = await Movie.find({
      isPublished: true,
      $or: [
        { title: { $regex: pattern, $options: "i" } },
        { seriesTitle: { $regex: pattern, $options: "i" } },
        { genre: { $regex: pattern, $options: "i" } },
      ],
    })
      .select("title slug poster backdrop genre views year")
      .sort({ views: -1 })
      .limit(20)
      .lean();

    let movies = raw;

    // Boost results by user's genre preferences when logged in
    if (userId && raw.length > 0) {
      try {
        const progress = await Progress.find({ userId: String(userId) })
          .select("movieId")
          .sort({ updatedAt: -1 })
          .limit(30)
          .lean();

        if (progress.length > 0) {
          const watched = await Movie.find({
            _id: { $in: progress.map((p) => p.movieId) },
          })
            .select("genre")
            .lean();

          const genreScores = {};
          for (const m of watched) {
            for (const g of m.genre || []) {
              genreScores[g] = (genreScores[g] || 0) + 1;
            }
          }

          movies = raw
            .map((m) => {
              let boost = 0;
              for (const g of m.genre || []) boost += genreScores[g] || 0;
              return { ...m, _boost: boost };
            })
            .sort((a, b) =>
              b._boost !== a._boost
                ? b._boost - a._boost
                : (b.views || 0) - (a.views || 0)
            );
        }
      } catch (_err) {
        // fall back to default sort
      }
    }

    movies = movies.slice(0, 8);

    const genreSet = new Set();
    movies.forEach((m) => {
      (Array.isArray(m.genre) ? m.genre : [m.genre])
        .filter(Boolean)
        .forEach((g) => genreSet.add(g));
    });
    const keywords = [...genreSet].slice(0, 6);

    return res.json({ success: true, movies, keywords });
  } catch (err) {
    console.error("getSuggestions error:", err);
    return res.status(500).json({ success: false, movies: [], keywords: [] });
  }
};

const FOR_YOU_PROJECTION =
  "title slug poster backdrop genre views year rating videoWidth videoHeight previewTimeline seriesId seriesTitle season episode episodeLabel duration";

const getForYou = async (req, res) => {
  try {
    setNoStore(res);
    const userId = req.user?._id;

    let genreScores = {};
    let excludeIds = [];

    if (userId) {
      const [progress, user] = await Promise.all([
        Progress.find({ userId: String(userId) })
          .select("movieId")
          .sort({ updatedAt: -1 })
          .limit(50)
          .lean(),
        User.findById(userId).select("likedMovies").lean(),
      ]);

      const watchedIds = [...new Set(progress.map((p) => p.movieId.toString()))];
      const likedIds = (user?.likedMovies || [])
        .map((m) => String(m?._id || m?.id || m))
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

      const likedSet = new Set(likedIds);
      excludeIds = [...new Set([...watchedIds, ...likedIds])].filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (excludeIds.length > 0) {
        const interacted = await Movie.find({ _id: { $in: excludeIds } })
          .select("_id genre")
          .lean();

        for (const movie of interacted) {
          const weight = likedSet.has(movie._id.toString()) ? 2.5 : 1;
          for (const g of movie.genre || []) {
            genreScores[g] = (genreScores[g] || 0) + weight;
          }
        }
      }
    }

    const topGenres = Object.entries(genreScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([g]) => g);

    let movies, reason, personalized;

    if (topGenres.length === 0) {
      movies = await Movie.find({
        isPublished: true,
        contentArea: { $ne: "world" },
      })
        .sort({ views: -1 })
        .limit(12)
        .select(FOR_YOU_PROJECTION)
        .lean();
      reason = "Phim nổi bật";
      personalized = false;
    } else {
      const candidates = await Movie.find({
        isPublished: true,
        contentArea: { $ne: "world" },
        _id: { $nin: excludeIds },
        genre: { $in: topGenres },
      })
        .select(FOR_YOU_PROJECTION)
        .limit(60)
        .lean();

      const scored = candidates.map((movie) => {
        let gs = 0;
        for (const g of movie.genre || []) gs += genreScores[g] || 0;
        const pop = Math.log((movie.views || 0) + 1) / 9.21;
        const rat = ((movie.rating || 0) / 10) * 0.3;
        return { ...movie, _score: gs * (1 + pop * 0.4 + rat) };
      });

      scored.sort((a, b) => b._score - a._score);
      movies = scored.slice(0, 12);
      reason = `Vì bạn thích ${topGenres.slice(0, 2).join(", ")}`;
      personalized = true;
    }

    return res.json({ success: true, movies, reason, personalized, topGenres });
  } catch (err) {
    console.error("for-you error:", err);
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
  getSuggestions,
  getForYou,
};
