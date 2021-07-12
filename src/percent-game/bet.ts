import { utils } from "ethers";
import { contractWithSigner } from "../contract/contract";
import { BetType } from "../types/bet";
import { numberFixed } from "../utils/number";
import { getBSCScan } from "../utils/getBSCScan";
import { getReasonableLimit, getReasonablePrice } from "../contract/gas";
import type { Round } from "../types/round";
import { getMultiplier } from "../utils/getMultiplier";

export enum BetResponseCode {
  FAILED,
  SUCCESS,
}

export interface BetResponseType {
  code: BetResponseCode;
  hash?: string;
}

export const bet = async ({
  position,
  amount,
}: {
  position: BetType; // 投注方向
  amount: number; // 投注额
}): Promise<BetResponseType> => {
  const [gasPrice, gasLimit] = await Promise.all([
    getReasonablePrice(),
    getReasonableLimit(),
  ]);
  console.log("🧐 投注", { position, amount, gasPrice });
  return contractWithSigner[position]({
    value: utils.parseUnits(amount.toString(), 18),
    gasPrice: utils.parseUnits(gasPrice.toFixed(12).replace(/0+$/, ""), 18),
    gasLimit,
  })
    .then((tx: any) => {
      console.log(
        "😳 尝试投注，链地址",
        getBSCScan(tx.hash),
        `投注金额 ${amount}`,
        `GAS FEE ${numberFixed(gasPrice * gasLimit, 4)}`
      );
      return tx
        .wait()
        .then(() => {
          return {
            code: BetResponseCode.SUCCESS,
            hash: tx.hash,
          };
        })
        .catch((err: any) => {
          console.error("🥵 投注失败，打包！", err);
          return {
            code: BetResponseCode.FAILED,
            hash: tx.hash,
          };
        });
    })
    .catch((err: any) => {
      console.error("🥵 投注失败", err);
      return {
        code: BetResponseCode.FAILED,
      };
    });
};

const getSmallPosition = (round: Round) => {
  const bearMultiplier = getMultiplier(round.totalAmount, round.bearAmount);
  const bullMultiplier = getMultiplier(round.totalAmount, round.bullAmount);

  return bullMultiplier < bearMultiplier ? BetType.BULL : BetType.BEAR;
};

const getBigPosition = (round: Round) => {
  const bearMultiplier = getMultiplier(round.totalAmount, round.bearAmount);
  const bullMultiplier = getMultiplier(round.totalAmount, round.bullAmount);

  return bullMultiplier < bearMultiplier ? BetType.BEAR : BetType.BULL;
};

interface BetParamsType {
  amount: number;
  round: Round;
}

export const betSmall = ({ amount, round }: BetParamsType) => {
  return bet({
    position: getSmallPosition(round),
    amount,
  });
};

export const mockBet = (
  { amount, round }: BetParamsType,
  isBig = false
): Promise<BetType> => {
  return new Promise(async (resolve) => {
    // await sleep(Math.round(Math.random() * 200) + 50);
    resolve(isBig ? getBigPosition(round) : getSmallPosition(round));
  });
};
