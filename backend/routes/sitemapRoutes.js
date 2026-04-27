const express = require("express");
const router = express.Router();
const Movie = require("../models/Movie");

const BASE_URL = "https://www.clipdam18.com";

router.get("/", async (req, res) => {
  try {
    const movies = await Movie.find({ isPublished: true })
      .select("_id title updatedAt")
      .lean();

    const today = new Date().toISOString().split("T")[0];

    const urls = movies
      .map((m) => {
        const lastmod = m.updatedAt
          ? new Date(m.updatedAt).toISOString().split("T")[0]
          : today;
        return (
          `  <url>\n` +
          `    <loc>${BASE_URL}/movie/${m._id}</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `    <changefreq>weekly</changefreq>\n` +
          `    <priority>0.9</priority>\n` +
          `  </url>`
        );
      })
      .join("\n");

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `${urls}\n` +
      `</urlset>`;

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=1800");
    res.set("Access-Control-Allow-Origin", "*");
    res.send(xml);
  } catch (err) {
    console.error("Sitemap error:", err);
    res.status(500).send(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>`);
  }
});

module.exports = router;
