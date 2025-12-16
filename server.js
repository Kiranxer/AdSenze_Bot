require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bot = require("./bot");
const Ad = require("./models/Ad");

const app = express();

/* ------------------ MIDDLEWARE ------------------ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ------------------ DATABASE ------------------ */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });

/* ------------------ ROUTES ------------------ */

// Home page (FIXES Cannot GET /)
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>AdSenze</title>
        <style>
          body { font-family: Arial; background:#0f0f14; color:#fff; text-align:center; padding-top:60px; }
          a { color:#ff4ecd; font-size:18px; text-decoration:none; }
        </style>
      </head>
      <body>
        <h1>🚀 AdSenze is Live</h1>
        <p>Telegram Stars Advertising Bot is running successfully.</p>
        <p><a href="/login.html">Go to Admin Panel →</a></p>
      </body>
    </html>
  `);
});

// Admin login
app.post("/login", (req, res) => {
  if (req.body.password === process.env.ADMIN_PANEL_PASSWORD) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false });
});

// Get pending ads
app.get("/ads", async (req, res) => {
  const ads = await Ad.find({ status: "pending" }).sort({ createdAt: -1 });
  res.json(ads);
});

// Approve ad (web panel)
app.post("/approve/:id", async (req, res) => {
  const ad = await Ad.findOne({ adId: req.params.id });
  if (!ad) return res.sendStatus(404);

  ad.status = "approved";
  await ad.save();

  res.json({ success: true });
});

// Reject ad (web panel)
app.post("/reject/:id", async (req, res) => {
  await Ad.findOneAndUpdate(
    { adId: req.params.id },
    { status: "rejected" }
  );
  res.json({ success: true });
});

/* ------------------ START SERVICES ------------------ */

// Start bot
bot.launch().then(() => {
  console.log("🤖 Telegram bot started");
});

// Start server (Koyeb)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => bot.stop("SIGTERM"));
process.on("SIGINT", () => bot.stop("SIGINT"));
