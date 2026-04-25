const mongoose = require("mongoose");

const AD_PLACEMENTS = [
  "home_top",
  "home_sidebar",
  "latest_top",
  "top_viewed_top",
  "movie_detail_below_player",
  "movie_detail_sidebar",
  "floating_bottom",
];

const AD_FORMATS = ["image", "html"];

const advertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    placement: {
      type: String,
      enum: AD_PLACEMENTS,
      required: true,
      index: true,
    },
    format: {
      type: String,
      enum: AD_FORMATS,
      default: "image",
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    targetUrl: {
      type: String,
      default: "",
      trim: true,
    },
    html: {
      type: String,
      default: "",
    },
    altText: {
      type: String,
      default: "",
      trim: true,
    },
    ctaLabel: {
      type: String,
      default: "",
      trim: true,
    },
    width: {
      type: String,
      default: "100%",
      trim: true,
    },
    height: {
      type: Number,
      default: 90,
      min: 40,
      max: 720,
    },
    priority: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    openInNewTab: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    clicks: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

advertisementSchema.index({
  placement: 1,
  isActive: 1,
  priority: -1,
  updatedAt: -1,
});

module.exports = {
  Advertisement: mongoose.model("Advertisement", advertisementSchema),
  AD_PLACEMENTS,
  AD_FORMATS,
};
