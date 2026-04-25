const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["request", "error"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userName: { type: String, default: "Ẩn danh" },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "seen", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
