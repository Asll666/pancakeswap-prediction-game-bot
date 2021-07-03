import { utils } from "ethers";
import { isHex } from "./hex";
import type { BigNumberType } from "../types/BigNumberType";

export const hexToNumber = (
  { _hex, _isBigNumber }: BigNumberType,
  unitLength = 18
): string => {
  if (!_isBigNumber) {
    throw new Error(`_isBigNumber与预期不一致`);
  }
  if (isHex(_hex)) {
    throw new Error("_hex与预期不一致：" + _hex);
  }
  return utils.formatUnits(_hex, unitLength);
  // return new BigNumber(_hex).toNumber();
};

/**
 * 将BNB余额Hex转为数值
 * @param data
 */
export const getCoinNumberFromHexStr = (data: BigNumberType): string => {
  return hexToNumber(data, 18);
};

export const getCoinNumberFromHex = (data: BigNumberType): number =>
  Number(getCoinNumberFromHexStr(data));

export const getIDFromHex = (data: BigNumberType): number => {
  return Number(hexToNumber(data, 0));
};

export const getPriceFromHex = (data: BigNumberType): number => {
  return Number(hexToNumber(data, 8));
};
