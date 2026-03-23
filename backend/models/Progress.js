const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  movieId: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
  currentTime: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Progress", progressSchema);