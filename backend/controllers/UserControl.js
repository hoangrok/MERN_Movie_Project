const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/UserModel");
const Movie = require("../models/Movie");
const { sendMail } = require("../utils/mailer");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const getSnapshotMovieId = (movie = {}) => {
  return String(movie?._id || movie?.id || "").trim();
};

const cleanLikedMovies = async (user) => {
  const likedMovies = Array.isArray(user?.likedMovies) ? user.likedMovies : [];
  const ids = [
    ...new Set(
      likedMovies
        .map(getSnapshotMovieId)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    ),
  ];

  if (ids.length === 0) {
    if (likedMovies.length > 0) {
      user.likedMovies = [];
      await user.save();
    }
    return [];
  }

  const liveMovies = await Movie.find({
    _id: { $in: ids },
    isPublished: true,
  })
    .select("_id")
    .lean();
  const liveIds = new Set(liveMovies.map((movie) => movie._id.toString()));
  const nextLikedMovies = likedMovies.filter((movie) =>
    liveIds.has(getSnapshotMovieId(movie))
  );

  if (nextLikedMovies.length !== likedMovies.length) {
    user.likedMovies = nextLikedMovies;
    await user.save();
  }

  return nextLikedMovies;
};

// REGISTER
module.exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      likedMovies: [],
    });

    return res.status(201).json({
      success: true,
      message: "Register successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        likedMovies: user.likedMovies,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      },
    });
  } catch (err) {
    console.log("registerUser error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// LOGIN
module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const likedMovies = await cleanLikedMovies(user);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        likedMovies,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      },
    });
  } catch (err) {
    console.log("loginUser error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// FORGOT PASSWORD
module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email là bắt buộc" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn trong vòng vài phút." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetToken = hashedToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

    await sendMail({
      to: user.email,
      subject: "Đặt lại mật khẩu - clipdam18.com",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
          <h2 style="margin:0 0 16px;color:#e50914;font-size:22px">Đặt lại mật khẩu</h2>
          <p style="margin:0 0 8px;color:#374151">Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản <strong>${user.email}</strong>.</p>
          <p style="margin:0 0 24px;color:#374151">Click vào nút bên dưới để đặt lại. Link có hiệu lực trong <strong>1 giờ</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:13px 28px;background:#e50914;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">Đặt lại mật khẩu</a>
          <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">Nếu bạn không yêu cầu điều này, hãy bỏ qua email này. Mật khẩu sẽ không thay đổi.</p>
        </div>
      `,
    });

    return res.json({ success: true, message: "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn trong vòng vài phút." });
  } catch (err) {
    console.error("forgotPassword error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// RESET PASSWORD
module.exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Mật khẩu phải ít nhất 6 ký tự" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return res.json({ success: true, message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập." });
  } catch (err) {
    console.error("resetPassword error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE PROFILE (display name)
module.exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Tên không được để trống" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true, select: "-password -resetToken -resetTokenExpiry" }
    );

    return res.json({
      success: true,
      message: "Cập nhật tên thành công",
      user: { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (err) {
    console.error("updateProfile error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// CHANGE PASSWORD
module.exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải ít nhất 6 ký tự",
      });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (err) {
    console.log("changePassword error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET PROFILE
module.exports.getProfile = async (req, res) => {
  try {
    const userDoc = await User.findById(req.user._id);
    const likedMovies = await cleanLikedMovies(userDoc);
    const user = req.user.toObject ? req.user.toObject() : req.user;
    user.likedMovies = likedMovies;

    return res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.log("getProfile error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET LIKED MOVIES
module.exports.getLikedMovies = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const movies = await cleanLikedMovies(user);

    return res.json({
      success: true,
      movies,
    });
  } catch (err) {
    console.log("getLikedMovies error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// ADD TO LIKED MOVIES
module.exports.addtoLikedMovies = async (req, res) => {
  try {
    const { movie } = req.body;
    const movieId = getSnapshotMovieId(movie);

    if (!movie || !movieId || !mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({
        success: false,
        message: "Movie data is required",
      });
    }

    const user = await User.findById(req.user._id);
    user.likedMovies = await cleanLikedMovies(user);

    const liveMovie = await Movie.exists({ _id: movieId, isPublished: true });
    if (!liveMovie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
        movies: user.likedMovies,
      });
    }

    const movieExists = user.likedMovies.find(
      (m) => getSnapshotMovieId(m) === movieId
    );

    if (movieExists) {
      return res.json({
        success: true,
        message: "Movie already liked",
        movies: user.likedMovies,
      });
    }

    user.likedMovies.push({ ...movie, id: movieId });
    await user.save();

    return res.json({
      success: true,
      message: "Movie added to liked movies",
      movies: user.likedMovies,
    });
  } catch (err) {
    console.log("addtoLikedMovies error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// REMOVE FROM LIKED MOVIES
module.exports.removeFromLikedMovies = async (req, res) => {
  try {
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({
        success: false,
        message: "movieId is required",
      });
    }

    const user = await User.findById(req.user._id);

    user.likedMovies = user.likedMovies.filter(
      (m) => getSnapshotMovieId(m) !== String(movieId)
    );

    await user.save();

    return res.json({
      success: true,
      message: "Movie removed from liked movies",
      movies: user.likedMovies,
    });
  } catch (err) {
    console.log("removeFromLikedMovies error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
