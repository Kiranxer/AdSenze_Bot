require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const { v4: uuidv4 } = require("uuid");
const Ad = require("./models/Ad");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMINS = process.env.ADMIN_IDS.split(",").map(Number);

const packages = {
  p99: { stars: 99, hours: 6, pin: false },
  p199: { stars: 199, hours: 16, pin: false },
  p249: { stars: 249, hours: 24, pin: false },
  p299: { stars: 299, hours: 24, pin: true }
};

bot.start(ctx => {
  ctx.reply(
    "📢 Advertise in our group using ⭐ Telegram Stars",
    Markup.inlineKeyboard([
      [Markup.button.callback("📣 Advertise Now", "START_AD")]
    ])
  );
});

bot.action("START_AD", ctx => {
  ctx.reply(
    "Choose your package:",
    Markup.inlineKeyboard([
      [Markup.button.pay("99⭐ – 6 Hours", "p99")],
      [Markup.button.pay("199⭐ – 16 Hours", "p199")],
      [Markup.button.pay("249⭐ – 24 Hours", "p249")],
      [Markup.button.pay("299⭐ – 24 Hours + PIN", "p299")]
    ])
  );
});

bot.on("pre_checkout_query", ctx => ctx.answerPreCheckoutQuery(true));

bot.on("successful_payment", ctx => {
  const payload = ctx.message.successful_payment.invoice_payload;
  ctx.session = packages[payload];
  ctx.reply("✅ Payment successful!\n\nSend your advertisement now.");
});

bot.on(["text", "photo", "video"], async ctx => {
  if (!ctx.session) return;

  const ad = await Ad.create({
    adId: uuidv4(),
    userId: ctx.from.id,
    content: ctx.message,
    hours: ctx.session.hours,
    pin: ctx.session.pin
  });

  ADMINS.forEach(id => {
    bot.telegram.sendMessage(
      id,
      `🆕 New Ad Request\n\nAd ID: ${ad.adId}\nHours: ${ad.hours}\nPin: ${ad.pin}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Approve", `APP_${ad.adId}`)],
        [Markup.button.callback("❌ Reject", `REJ_${ad.adId}`)]
      ])
    );
  });

  ctx.reply("📨 Ad submitted for admin approval.");
  ctx.session = null;
});

bot.action(/APP_(.+)/, async ctx => {
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
    await bot.telegram.deleteMessage(process.env.GROUP_ID, ad.messageId);
    if (ad.pin) await bot.telegram.unpinChatMessage(process.env.GROUP_ID);
  }, ad.hours * 3600000);

  ctx.reply("✅ Ad approved & posted.");
});

bot.action(/REJ_(.+)/, async ctx => {
  if (!ADMINS.includes(ctx.from.id)) return;
  await Ad.findOneAndUpdate({ adId: ctx.match[1] }, { status: "rejected" });
  ctx.reply("❌ Ad rejected.");
});

module.exports = bot;
