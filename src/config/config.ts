const config = require("../../project-config.json");

export default {
  wallet: config.privateKey as string,
  account: config.account.toLowerCase(),
};
