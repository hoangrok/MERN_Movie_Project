const mongoose = require("mongoose");
const {
  Advertisement,
  AD_PLACEMENTS,
  AD_FORMATS,
} = require("../models/Advertisement");

const PUBLIC_FIELDS = [
  "_id",
  "title",
  "placement",
  "format",
  "imageUrl",
  "targetUrl",
  "html",
  "altText",
  "ctaLabel",
  "width",
  "height",
  "openInNewTab",
].join(" ");

const setPublicCache = (res) => {
  res.set(
    "Cache-Control",
    "public, max-age=30, s-maxage=60, stale-while-revalidate=180"
  );
};

const setNoStore = (res) => {
  res.set("Cache-Control", "private, no-store");
};

const cleanString = (value = "") =>
  typeof value === "string" ? value.trim() : "";

const parseDate = (value) => {
  const cleaned = cleanString(value);
  if (!cleaned) return null;

  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toBool = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value === "true" || value === "1" || value === "on";
  }
  return fallback;
};

const buildPayload = (body = {}) => {
  const payload = {
    title: cleanString(body.title),
    placement: cleanString(body.placement),
    format: cleanString(body.format || "image"),
    imageUrl: cleanString(body.imageUrl),
    targetUrl: cleanString(body.targetUrl),
    html: typeof body.html === "string" ? body.html.trim() : "",
    altText: cleanString(body.altText),
    ctaLabel: cleanString(body.ctaLabel),
    width: cleanString(body.width) || "100%",
    height: Number(body.height) || 90,
    priority: Number(body.priority) || 0,
    isActive: toBool(body.isActive, true),
    startsAt: parseDate(body.startsAt),
    endsAt: parseDate(body.endsAt),
    openInNewTab: toBool(body.openInNewTab, true),
    notes: cleanString(body.notes),
  };

  payload.height = Math.max(40, Math.min(payload.height, 720));

  return payload;
};

const validatePayload = (payload) => {
  if (!payload.title) return "Title is required";
  if (!AD_PLACEMENTS.includes(payload.placement)) return "Invalid placement";
  if (!AD_FORMATS.includes(payload.format)) return "Invalid ad format";

  if (payload.format === "image" && !payload.imageUrl) {
    return "Image URL is required for image ads";
  }

  if (payload.format === "html" && !payload.html) {
    return "HTML code is required for HTML ads";
  }

  if (payload.startsAt && payload.endsAt && payload.startsAt > payload.endsAt) {
    return "Start date must be before end date";
  }

  return "";
};

const getPublicAds = async (req, res) => {
  try {
    setPublicCache(res);

    const placement = cleanString(req.query.placement);
    const limit = Math.min(Math.max(Number(req.query.limit) || 1, 1), 10);

    if (placement && !AD_PLACEMENTS.includes(placement)) {
      return res.status(400).json({
        success: false,
        message: "Invalid placement",
      });
    }

    const now = new Date();
    const filter = {
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    };

    if (placement) filter.placement = placement;

    const items = await Advertisement.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ priority: -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      items,
    });
  } catch (err) {
    console.error("getPublicAds error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getAdminAds = async (req, res) => {
  try {
    setNoStore(res);

    const items = await Advertisement.find({})
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      items,
      placements: AD_PLACEMENTS,
      formats: AD_FORMATS,
    });
  } catch (err) {
    console.error("getAdminAds error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const createAd = async (req, res) => {
  try {
    setNoStore(res);

    const payload = buildPayload(req.body);
    const validationMessage = validatePayload(payload);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const ad = await Advertisement.create(payload);

    return res.status(201).json({
      success: true,
      item: ad,
    });
  } catch (err) {
    console.error("createAd error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const updateAd = async (req, res) => {
  try {
    setNoStore(res);

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ad id",
      });
    }

    const payload = buildPayload(req.body);
    const validationMessage = validatePayload(payload);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const ad = await Advertisement.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    return res.json({
      success: true,
      item: ad,
    });
  } catch (err) {
    console.error("updateAd error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const deleteAd = async (req, res) => {
  try {
    setNoStore(res);

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ad id",
      });
    }

    const ad = await Advertisement.findByIdAndDelete(id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    return res.json({
      success: true,
      message: "Ad deleted",
    });
  } catch (err) {
    console.error("deleteAd error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const trackAdClick = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.Types.ObjectId.isValid(id)) {
      await Advertisement.findByIdAndUpdate(id, { $inc: { clicks: 1 } });
    }

    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: true });
  }
};

module.exports = {
  getPublicAds,
  getAdminAds,
  createAd,
  updateAd,
  deleteAd,
  trackAdClick,
};
