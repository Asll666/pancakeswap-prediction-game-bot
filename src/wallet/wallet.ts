import { Wallet } from "ethers";
import config from "../config/config";
import { getBnbNumberFromHex } from "../utils/money";
import { provider } from "../provider/provider";
import { getHexString } from "../utils/hex";

export const wallet = new Wallet(getHexString(config.wallet), provider);

wallet
  .getBalance()
  .then(({ _isBigNumber, _hex }) => {
    console.log(
      "钱包连接成功，当前余额",
      getBnbNumberFromHex({ _hex, _isBigNumber })
    );
  })
  .catch((err) => {
    console.error(err);
    throw new Error("钱包连接失败" + err.message);
  });
