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

/**
 * 补零，不支持负数（负数会自动转为正数）
 */
export function zeroFill(number: NumberTransformParams, length = 2): string {
  const numArr = number.toString().split(".");
  let decimal = numArr[1] || "";
  // 长度不足时，自动补0
  while (decimal.length < length) {
    decimal += "0";
  }
  return `${numArr[0]}.${decimal}`;
}
