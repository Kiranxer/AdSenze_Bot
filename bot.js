require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const { v4: uuidv4 } = require("uuid");
const Ad = require("./models/Ad");

const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMINS = process.env.ADMIN_IDS.split(",").map(Number);

const PACKAGES = {
  99: { hours: 6, pin: false },
  199: { hours: 16, pin: false },
  249: { hours: 24, pin: false },
  299: { hours: 24, pin: true }
};

const userState = new Map();

/* START */
bot.start(async (ctx) => {
  await ctx.reply(
    "📢 Advertise in our group using ⭐ Telegram Stars",
    Markup.inlineKeyboard([
      [Markup.button.callback("📣 Advertise Now", "OPEN_PACKAGES")]
    ])
  );
});

/* PACKAGE MENU */
bot.action("OPEN_PACKAGES", async (ctx) => {
  await ctx.editMessageText(
    "⭐ Choose your advertising package:",
    Markup.inlineKeyboard([
      [Markup.button.callback("99⭐ – 6 Hours", "BUY_99")],
      [Markup.button.callback("199⭐ – 16 Hours", "BUY_199")],
      [Markup.button.callback("249⭐ – 24 Hours", "BUY_249")],
      [Markup.button.callback("299⭐ – 24 Hours + 📌 Pin", "BUY_299")]
    ])
  );
});

/* SEND INVOICE */
bot.action(/BUY_(\d+)/, async (ctx) => {
  const stars = Number(ctx.match[1]);
  const pack = PACKAGES[stars];
  if (!pack) return;

  userState.set(ctx.from.id, pack);

  await ctx.replyWithInvoice({
    title: "AdSenze Group Advertisement",
    description: `${stars}⭐ advertisement for ${pack.hours} hours${pack.pin ? " with PIN" : ""}`,
    payload: `ADSENZE_${stars}_${Date.now()}`,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: `${stars} Stars`, amount: stars }]
  });
});

/* PRE CHECKOUT */
bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

/* PAYMENT SUCCESS */
bot.on("successful_payment", async (ctx) => {
  const pack = userState.get(ctx.from.id);
  if (!pack) return;

  await ctx.reply(
    "✅ Payment successful!\n\n📨 Now send your advertisement."
  );
});

/* RECEIVE AD */
bot.on(["text", "photo", "video"], async (ctx) => {
  const pack = userState.get(ctx.from.id);
  if (!pack) return;

  const ad = await Ad.create({
    adId: uuidv4(),
    userId: ctx.from.id,
    content: ctx.message,
    hours: pack.hours,
    pin: pack.pin,
    status: "pending"
  });

  for (const admin of ADMINS) {
    await bot.telegram.sendMessage(
      admin,
      `🆕 New Ad Request\n\n🆔 ${ad.adId}\n👤 User: ${ctx.from.id}\n⏳ ${ad.hours}h\n📌 Pin: ${ad.pin}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Approve", `APPROVE_${ad.adId}`),
          Markup.button.callback("❌ Reject", `REJECT_${ad.adId}`)
        ]
      ])
    );
  }

  await ctx.reply("📨 Ad sent for admin approval.");
  userState.delete(ctx.from.id);
});

/* APPROVE */
bot.action(/APPROVE_(.+)/, async (ctx) => {
  if (!ADMINS.includes(ctx.from.id)) return;

  const ad = await Ad.findOne({ adId: ctx.match[1] });
  if (!ad || ad.status !== "pending") return;

  const sent = await bot.telegram.sendMessage(
    process.env.GROUP_ID,
    ad.content.text || "📢 Advertisement"
  );

  if (ad.pin) {
    await bot.telegram.pinChatMessage(process.env.GROUP_ID, sent.message_id);
  }

  ad.status = "approved";
  ad.messageId = sent.message_id;
  ad.expireAt = new Date(Date.now() + ad.hours * 3600000);
  await ad.save();

  setTimeout(async () => {
    try {
      await bot.telegram.deleteMessage(process.env.GROUP_ID, ad.messageId);
      if (ad.pin) await bot.telegram.unpinChatMessage(process.env.GROUP_ID);
    } catch {}
  }, ad.hours * 3600000);

  await ctx.reply("✅ Ad approved & posted.");
});

/* REJECT */
bot.action(/REJECT_(.+)/, async (ctx) => {
  if (!ADMINS.includes(ctx.from.id)) return;

  await Ad.findOneAndUpdate(
    { adId: ctx.match[1] },
    { status: "rejected" }
  );

  await ctx.reply("❌ Ad rejected.");
});

module.exports = bot;
