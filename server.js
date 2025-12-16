app.get("/", (req, res) => {
  res.send(`
    <h2>🚀 AdSenze is Live</h2>
    <p>Telegram Ads Bot is running successfully.</p>
    <p><a href="/login.html">Go to Admin Panel</a></p>
  `);
});
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bot = require("./bot");
const Ad = require("./models/Ad");

mongoose.connect(process.env.MONGO_URI);

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/login", (req, res) => {
  if (req.body.password === process.env.ADMIN_PANEL_PASSWORD)
    return res.json({ success: true });
  res.sendStatus(401);
});

app.get("/ads", async (req, res) => {
  res.json(await Ad.find({ status: "pending" }));
});

app.post("/approve/:id", async (req, res) => {
  const ad = await Ad.findOne({ adId: req.params.id });
  if (!ad) return res.sendStatus(404);
  ad.status = "approved";
  await ad.save();
  res.json({ success: true });
});

app.post("/reject/:id", async (req, res) => {
  await Ad.findOneAndUpdate({ adId: req.params.id }, { status: "rejected" });
  res.json({ success: true });
});

bot.launch();
app.listen(process.env.PORT, () => console.log("Running on Koyeb"));
