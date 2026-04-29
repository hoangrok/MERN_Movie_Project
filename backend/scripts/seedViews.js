const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Movie = require("../models/Movie");

// Sinh số view ngẫu nhiên trông tự nhiên, không tròn, từ min đến max
function randomViews(min = 10_000, max = 40_000) {
  const base = Math.floor(Math.random() * ((max - min) / 100)) * 100 + min;
  const tail = Math.floor(Math.random() * 90) + 7; // 7..96
  const v = base + tail;
  return v % 100 === 0 ? v + 13 : v;
}

async function run() {
  if (!process.env.DB_CONNECT) {
    throw new Error("Missing DB_CONNECT in backend/.env");
  }

  await mongoose.connect(process.env.DB_CONNECT);
  console.log("Connected to MongoDB");

  const movies = await Movie.find({}).select("_id title views");
  console.log(`Found ${movies.length} movies`);

  let updated = 0;
  for (const movie of movies) {
    const views = randomViews();
    await Movie.updateOne({ _id: movie._id }, { $set: { views } });
    console.log(`  [OK] "${movie.title}" => ${views.toLocaleString("vi-VN")} views`);
    updated++;
  }

  console.log(`\nDone. Updated ${updated}/${movies.length} movies.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
