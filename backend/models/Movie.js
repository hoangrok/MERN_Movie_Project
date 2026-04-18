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
    duration: { type: Number, default: 0 },
    hlsUrl: { type: String, default: "" },
    trailerUrl: { type: String, default: "" },
    type: { type: String, enum: ["movie", "tv"], default: "movie" },
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

    previewTimeline: {
      duration: { type: Number, default: 0 },
      interval: { type: Number, default: 10 },
      items: [
        {
          second: { type: Number, default: 0 },
          url: { type: String, default: "" },
        },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Movie", movieSchema);