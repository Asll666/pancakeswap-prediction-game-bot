type NumberTransformParams = string | number;

/**
 * 数字格式化
 * 支持字符串转数字，以及修复浮点数精度缺失的问题
 * @param data
 * @param length
 */
export function numberFixed(data: NumberTransformParams, length = 2): number {
  // 如果是字符串需要过滤掉千分位逗号
  const num = Number(typeof data === "string" ? data.replace(/,/g, "") : data);
  let times = 1;
  for (let i = 0; i < length; i++) {
    times *= 10;
  }
  return Math.round(num * times) / times;
}
