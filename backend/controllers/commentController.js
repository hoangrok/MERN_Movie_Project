const mongoose = require("mongoose");
const Comment = require("../models/Comment");

exports.getComments = async (req, res) => {
  try {
    const { movieId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ success: false, message: "movieId không hợp lệ" });
    }

    const [comments, total] = await Promise.all([
      Comment.find({ movieId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Comment.countDocuments({ movieId }),
    ]);

    return res.json({
      success: true,
      comments,
      total,
      page,
      hasMore: skip + comments.length < total,
    });
  } catch (err) {
    console.error("getComments error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { movieId, content } = req.body;

    if (!movieId || !content?.trim()) {
      return res.status(400).json({ success: false, message: "movieId và nội dung là bắt buộc" });
    }
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ success: false, message: "movieId không hợp lệ" });
    }
    if (content.trim().length > 500) {
      return res.status(400).json({ success: false, message: "Bình luận tối đa 500 ký tự" });
    }

    const comment = await Comment.create({
      movieId,
      userId: req.user._id,
      userName: req.user.name,
      content: content.trim(),
    });

    return res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error("addComment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bình luận" });
    }

    const isOwner = comment.userId.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Không có quyền xóa" });
    }

    await comment.deleteOne();
    return res.json({ success: true, message: "Đã xóa bình luận" });
  } catch (err) {
    console.error("deleteComment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
