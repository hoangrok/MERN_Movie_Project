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

// CORS
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());

// Routes
app.use("/api/movies", movieRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/debug", debugRoutes);

// Health check
app.get("/", (req, res) => res.send("API is running"));

// Connect MongoDB & Start server
mongoose.set("strictQuery", false);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECT);
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`Server running on port ${PORT}`)
    );
  } catch (err) {
    console.error("Server start failed:", err.message);
    process.exit(1);
  }
};

startServer();