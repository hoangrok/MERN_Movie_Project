const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");

const uploadRoutes = require("./routes/uploadRoutes");
const movieRoutes = require("./routes/movieRoutes");
const userRoutes = require("./routes/UserRoutes");
const debugRoutes = require("./routes/DebugRoutes");

const app = express();

app.set("trust proxy", 1);

// CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
  "https://mern-movie-project-henna.vercel.app",
  "https://clipdam18.com",
  "https://www.clipdam18.com",
  "https://api.clipdam18.com",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin);

    // Tạm cho qua để tránh browser chặn lúc debug local/public
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
    abortOnLimit: true,
    safeFileNames: false,
    preserveExtension: true,
    limits: {
      fileSize: 2 * 1024 * 1024 * 1024, // 2GB
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

// Health check
app.get("/", (req, res) => res.send("API is running"));

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "OK",
    env: process.env.NODE_ENV || "development",
    allowedOrigins,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);

  return res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// Connect MongoDB & Start server
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