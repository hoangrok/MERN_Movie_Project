const router = require("express").Router();
const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { getComments, addComment, deleteComment } = require("../controllers/commentController");

router.get("/:movieId", optionalAuth, getComments);
router.post("/", protect, addComment);
router.delete("/:id", protect, deleteComment);

module.exports = router;
