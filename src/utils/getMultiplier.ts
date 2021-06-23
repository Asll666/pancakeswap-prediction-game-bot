import { numberFixed } from "./number";
import type { Round } from "../types/round";

/**
 * 获得投注比例
 */
export const getMultiplier = (
  total: number,
  amount: number,
  length = 6
): number => {
  if (total === 0 || amount === 0) {
    return 0;
  }

  return numberFixed(total / amount, length);
};

export const getMultiplierFromRound = (round: Round, isBigOdds = true) => {
  // 大于0，则是up 投注更多
  const { bullAmount, totalAmount, bearAmount } = round;
  const isBullMore = bullAmount - bearAmount > 0;
  // 取大投注额与小投注额
  return getMultiplier(
    totalAmount,
    isBigOdds
      ? isBullMore
        ? bearAmount
        : bullAmount
      : isBullMore
      ? bullAmount
      : bearAmount
  );
};
