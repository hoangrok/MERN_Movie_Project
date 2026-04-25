const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/UserModel");
const Movie = require("../models/Movie");

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
