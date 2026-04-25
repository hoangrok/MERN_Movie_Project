const Feedback = require("../models/Feedback");

// POST /api/feedback
const createFeedback = async (req, res) => {
  try {
    const { type, message, movieId } = req.body;

    if (!type || !["request", "error"].includes(type)) {
      return res.status(400).json({ message: "type phải là request hoặc error" });
    }

    if (!message || message.trim().length < 3) {
      return res.status(400).json({ message: "Nội dung quá ngắn" });
    }

    const userId = req.user?._id || null;
    const userName = req.user?.name || req.user?.email || "Ẩn danh";

    const feedback = await Feedback.create({
      type,
      message: message.trim(),
      userId,
      userName,
      movieId: movieId || null,
    });

    res.status(201).json({ success: true, _id: feedback._id });
  } catch (err) {
    console.error("createFeedback error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// GET /api/feedback  (admin)
const getFeedbacks = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Feedback.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Feedback.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page) });
  } catch (err) {
    console.error("getFeedbacks error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// PATCH /api/feedback/:id/status  (admin)
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "seen", "resolved"].includes(status)) {
      return res.status(400).json({ message: "status không hợp lệ" });
    }
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!feedback) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = { createFeedback, getFeedbacks, updateStatus };
