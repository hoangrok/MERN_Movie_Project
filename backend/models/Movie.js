const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    poster: { type: String, default: "" },
    backdrop: { type: String, default: "" },
    genre: [{ type: String }],
    year: { type: Number, default: null },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    hlsUrl: { type: String, default: "" },
    trailerUrl: { type: String, default: "" },
    type: { type: String, enum: ["movie", "tv"], default: "movie" },
    contentArea: {
      type: String,
      enum: ["default", "world"],
      default: "default",
      index: true,
    },
    isPublished: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    newPopular: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    cast: [{ type: String }],
    director: { type: String, default: "" },
    language: { type: String, default: "English" },
    country: { type: String, default: "" },
    subtitles: [{ type: String }],

    status: {
      type: String,
      enum: ["draft", "queued", "processing", "ready", "failed"],
      default: "draft",
    },
    processingError: {
      type: String,
      default: "",
    },
    thumbnailPickedAt: {
      type: Number,
      default: null,
    },
    videoWidth: {
      type: Number,
      default: 0,
    },
    videoHeight: {
      type: Number,
      default: 0,
    },

    images: [{ type: String }],

    seriesId:     { type: String, default: "", index: true },
    seriesTitle:  { type: String, default: "" },
    season:       { type: Number, default: 1 },
    episode:      { type: Number, default: 1 },
    episodeLabel: { type: String, default: "" },
    episodeTitle: { type: String, default: "" },

    hlsKey: { type: String, default: "" },

    previewTimeline: {
      duration: { type: Number, default: 0 },
      interval: { type: Number, default: 10 },
      spriteUrl: { type: String, default: "" },
      spriteKey: { type: String, default: "" },
      cols: { type: Number, default: 0 },
      rows: { type: Number, default: 0 },
      frameWidth: { type: Number, default: 0 },
      frameHeight: { type: Number, default: 0 },
      totalItems: { type: Number, default: 0 },
      items: [
        {
          second: { type: Number, default: 0 },
          url: { type: String, default: "" },
          frameIndex: { type: Number, default: 0 },
        },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Movie", movieSchema);
