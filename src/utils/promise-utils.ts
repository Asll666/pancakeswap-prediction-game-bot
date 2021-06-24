/**
 * 延时 sleep 事件
 * @param time {number} 时间
 * @returns {Promise<void>}
 */
export function sleep(time = 1000): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}
