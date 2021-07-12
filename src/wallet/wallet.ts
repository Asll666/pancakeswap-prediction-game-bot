import { Wallet } from "ethers";
import config from "../config/config";
import { getCoinNumberFromHex } from "../utils/money";
import { provider } from "../provider/provider";
import { getHexString } from "../utils/hex";

export const wallet = new Wallet(getHexString(config.wallet), provider);

export const getBalance = () =>
  wallet
    .getBalance()
    .then(({ _isBigNumber, _hex }) =>
      getCoinNumberFromHex({ _hex, _isBigNumber })
    )
    .catch((err) => {
      console.error(err);
      throw new Error("钱包连接失败" + err.message);
    });

getBalance().then((money) => console.log("钱包连接成功，当前余额", money));
