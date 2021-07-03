const { Telegraf } = require("telegraf");
import config from "../config/config";

const bot = new Telegraf(config.telegram.botToken);

export const send = (...args: Array<string | number>) => {
  const message = args
    .map((item) => item.toString().replace(/\[\d+m/g, ""))
    .join(" ");
  return bot.telegram.sendMessage(config.telegram.receiverId, message);
};
