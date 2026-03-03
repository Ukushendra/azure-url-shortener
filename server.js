import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { nanoid } from "nanoid";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
const PORT = process.env.PORT || 5000;

// ======================
// DATABASE SETUP
// ======================
let db;

async function initDB() {
  db = await open({
    filename: "./urls.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code TEXT UNIQUE,
      original_url TEXT,
      clicks INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Database connected");
}

// ======================
// ROUTES
// ======================

// Create short URL
app.post("/shorten", async (req, res) => {
  try {
    const { originalUrl } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: "URL is required" });
    }

    const shortCode = nanoid(6);

    await db.run(
      "INSERT INTO urls (short_code, original_url) VALUES (?, ?)",
      shortCode,
      originalUrl
    );

    res.json({
      shortUrl: `${process.env.BASE_URL}/${shortCode}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Redirect route
app.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const url = await db.get(
      "SELECT * FROM urls WHERE short_code = ?",
      code
    );

    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    // Increase click count
    await db.run(
      "UPDATE urls SET clicks = clicks + 1 WHERE short_code = ?",
      code
    );

    res.redirect(url.original_url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});
// ======================
// START SERVER
// ======================
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});