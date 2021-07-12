/**
 * 延时 sleep 事件
 * @param time {number} 时间
 * @returns {Promise<void>}
 */
import { numberFixed } from "./number";

export function sleep(time = 1000): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

export const accurateSetTimeout = (
  callback: (...params: any) => any,
  timeout: number
) => {
  const end = Date.now() + timeout;
  let handler: NodeJS.Timeout;

  const sleep = () => {
    const now = Date.now();
    const balance = end - now;
    clearTimeout(handler);
    if (balance > 0) {
      handler = setTimeout(sleep, numberFixed(balance / 100, 0));
    } else {
      callback();
    }
  };

  sleep();
};
