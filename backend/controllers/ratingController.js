const mongoose = require("mongoose");
const Rating = require("../models/Rating");
const Movie = require("../models/Movie");

async function recalcMovieRating(movieId) {
  const [agg] = await Rating.aggregate([
    { $match: { movieId: new mongoose.Types.ObjectId(movieId) } },
    { $group: { _id: null, avg: { $avg: "$score" }, count: { $sum: 1 } } },
  ]);

  const avgRating = agg ? Math.round(agg.avg * 10) / 10 : 0;
  await Movie.findByIdAndUpdate(movieId, { rating: avgRating });
  return { avgRating, count: agg?.count || 0 };
}

exports.rateMovie = async (req, res) => {
  try {
    const { movieId, score } = req.body;

    if (!movieId || score == null) {
      return res.status(400).json({ success: false, message: "movieId và score là bắt buộc" });
    }
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ success: false, message: "movieId không hợp lệ" });
    }
    if (score < 1 || score > 5) {
      return res.status(400).json({ success: false, message: "Score phải từ 1-5" });
    }

    await Rating.findOneAndUpdate(
      { movieId, userId: req.user._id },
      { score },
      { upsert: true, new: true }
    );

    const { avgRating, count } = await recalcMovieRating(movieId);

    return res.json({ success: true, avgRating, count, myScore: score });
  } catch (err) {
    console.error("rateMovie error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMyRating = async (req, res) => {
  try {
    const { movieId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ success: false, message: "movieId không hợp lệ" });
    }

    const rating = await Rating.findOne({ movieId, userId: req.user._id });
    return res.json({ success: true, score: rating?.score || 0 });
  } catch (err) {
    console.error("getMyRating error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMovieRating = async (req, res) => {
  try {
    const { movieId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ success: false, message: "movieId không hợp lệ" });
    }

    const [agg] = await Rating.aggregate([
      { $match: { movieId: new mongoose.Types.ObjectId(movieId) } },
      { $group: { _id: null, avg: { $avg: "$score" }, count: { $sum: 1 } } },
    ]);

    return res.json({
      success: true,
      avgRating: agg ? Math.round(agg.avg * 10) / 10 : 0,
      count: agg?.count || 0,
    });
  } catch (err) {
    console.error("getMovieRating error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
