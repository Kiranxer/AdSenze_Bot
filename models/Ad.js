const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Ad",
  new mongoose.Schema({
    adId: String,
    userId: Number,
    content: Object,
    hours: Number,
    pin: Boolean,
    status: { type: String, default: "pending" },
    messageId: Number,
    expireAt: Date,
    createdAt: { type: Date, default: Date.now }
  })
);
