import type { Round } from "../types/round";

/**
 * 获取剩余时间
 * @param round
 */
export const calcBalanceTime = (round: Round): number => {
  return Math.round(calcBalanceTimeMs(round) / 1000);
};

/**
 * 获取剩余时间，毫秒时间
 * @param round
 */
export const calcBalanceTimeMs = (round: Round): number => {
  const { startAt } = round;
  const endTime = startAt + 5 * 60;

  return endTime * 1000 - Date.now();
};
