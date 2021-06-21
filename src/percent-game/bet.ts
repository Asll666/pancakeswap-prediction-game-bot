import { utils } from "ethers";
import { contractWithSigner } from "../contract/contract";
import type { BetType } from "../types/bet";
import { numberFixed } from "../utils/number";
import { getBSCScan } from "../utils/getBSCScan";

export const bet = ({
  position,
  amount,
  gasRate = 1,
}: {
  position: BetType; // 投注方向
  amount: number; // 投注额
  gasRate?: number; // gas 费率，默认为1，若为 1.5 则是 1.5 倍 gas 费
}) => {
  const gas = numberFixed(0.000000005 * gasRate, 12);
  console.log("投注", { position, amount, gasRate }, gas.toLocaleString());
  return contractWithSigner[position]({
    value: utils.parseUnits(amount.toString(), 18),
    gasPrice: utils.parseUnits("0.000000006", 18),
  })
    .then((tx: any) => {
      console.log(
        "投注成功，链地址",
        getBSCScan(tx.hash),
        `投注金额 ${amount}`,
        `GAS FEE ${gas}`
      );
      return tx.wait();
    })
    .then()
    .catch((err: any) => console.error("投注失败", err));
};
