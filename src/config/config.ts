const config = require("../../project-config.json");
const { privateKey, account, proxy, telegram } = config;

export default {
  wallet: privateKey as string,
  account: account.toLowerCase(),
  proxy: {
    host: proxy.host,
    port: proxy.port,
    auth: proxy.auth,
  },
  telegram: {
    botToken: telegram.botToken,
    receiverId: telegram.receiverId,
  },
};
