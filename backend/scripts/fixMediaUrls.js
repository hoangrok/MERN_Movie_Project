const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Movie = require("../models/Movie");

const OLD_BASE = "https://media-worker.hoang-media.workers.dev";
const NEW_BASE = "https://pub-8273d4583cb744c1b9bba4738716f0ee.r2.dev";

function replaceBase(url) {
  if (!url || typeof url !== "string") return url;
  return url.replace(OLD_BASE, NEW_BASE);
}

async function run() {
  try {
    if (!process.env.DB_CONNECT) {
      throw new Error("Missing DB_CONNECT in backend/.env");
    }

    await mongoose.connect(process.env.DB_CONNECT);
    console.log("Connected MongoDB");

    const movies = await Movie.find({});
    console.log(`Found ${movies.length} movies`);

    let updatedCount = 0;

    for (const movie of movies) {
      let changed = false;

      const nextPoster = replaceBase(movie.poster);
      if (nextPoster !== movie.poster) {
        movie.poster = nextPoster;
        changed = true;
      }

      const nextBackdrop = replaceBase(movie.backdrop);
      if (nextBackdrop !== movie.backdrop) {
        movie.backdrop = nextBackdrop;
        changed = true;
      }

      if (
        movie.previewTimeline &&
        Array.isArray(movie.previewTimeline.items) &&
        movie.previewTimeline.items.length
      ) {
        movie.previewTimeline.items = movie.previewTimeline.items.map((item) => {
          const nextUrl = replaceBase(item?.url);
          if (nextUrl !== item?.url) changed = true;

          return {
            ...item.toObject?.() || item,
            url: nextUrl,
          };
        });
      }

      if (changed) {
        await movie.save();
        updatedCount++;
        console.log(`Updated movie: ${movie.title} (${movie._id})`);
      }
    }

    console.log(`Done. Updated ${updatedCount} movie(s).`);
    process.exit(0);
  } catch (err) {
    console.error("fixMediaUrls error:", err);
    process.exit(1);
  }
}

run();