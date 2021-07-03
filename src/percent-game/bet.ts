import { utils } from "ethers";
import { contractWithSigner } from "../contract/contract";
import { BetType } from "../types/bet";
import { numberFixed } from "../utils/number";
import { getBSCScan } from "../utils/getBSCScan";
import { getLastGas } from "../contract/gas";
import type { Round } from "../types/round";
import { getMultiplier } from "../utils/getMultiplier";
import { sleep } from "../utils/promise-utils";

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
  gasRate = 1,
}: {
  position: BetType; // 投注方向
  amount: number; // 投注额
  gasRate?: number; // gas 费率，默认为1，若为 1.5 则是 1.5 倍 gas 费
}): Promise<BetResponseType> => {
  const initialGas = await getLastGas();
  const gas = numberFixed(initialGas * gasRate, 12);
  console.log(
    "投注",
    { position, amount, gasRate },
    gas.toFixed().replace(/0+$/, "")
  );
  return contractWithSigner[position]({
    value: utils.parseUnits(amount.toString(), 18),
    gasPrice: utils.parseUnits(gas.toFixed(12).replace(/0+$/, ""), 18),
    gasLimit: 150000,
  })
    .then((tx: any) => {
      console.log(
        "尝试投注，链地址",
        getBSCScan(tx.hash),
        `投注金额 ${amount}`,
        `GAS FEE ${gas}`
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
          console.error("投注失败，打包！", err);
          return {
            code: BetResponseCode.FAILED,
            hash: tx.hash,
          };
        });
    })
    .catch((err: any) => {
      console.error("投注失败", err);
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
    gasRate: 1.2,
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
