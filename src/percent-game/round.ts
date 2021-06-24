import type { Round } from "../types/round";

/**
 * 获取剩余时间
 * @param round
 */
export const calcBalanceTime = (round: Round): number => {
  const { startAt } = round;
  const endTime = startAt + 5 * 60;

  return endTime - Math.round(Date.now() / 1000);
};
