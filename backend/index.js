const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

console.log("BOOT VERSION: background-video-queue-v2");

const express = require("express");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const uploadRoutes = require("./routes/uploadRoutes");
const movieRoutes = require("./routes/movieRoutes");
const userRoutes = require("./routes/UserRoutes");
const debugRoutes = require("./routes/DebugRoutes");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
  "https://mern-movie-project-henna.vercel.app",
  "https://clipdam18.com",
  "https://www.clipdam18.com",
  "https://api.clipdam18.com",
].filter(Boolean);

// Security headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many auth requests, please try again later.",
  },
});

app.use("/api", apiLimiter);
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "tmp"),
    createParentPath: true,
    abortOnLimit: true,
    safeFileNames: false,
    preserveExtension: true,
    limits: {
      fileSize: 2 * 1024 * 1024 * 1024,
    },
    debug: false,
  })
);

// Request log
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use("/api/movies", movieRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/debug", debugRoutes);

app.get("/", (req, res) => res.send("API is running"));

app.get("/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    success: true,
    message: "OK",
    env: process.env.NODE_ENV || "development",
    allowedOrigins,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);

  if (!res.headersSent) {
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }

  next(err);
});

mongoose.set("strictQuery", false);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECT);
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Allowed origins:", allowedOrigins);
    });
  } catch (err) {
    console.error("Server start failed:", err.message);
    process.exit(1);
  }
};

startServer();