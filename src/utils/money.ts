import { utils } from "ethers";
import { isHex } from "./hex";

interface HexToNumberParams {
  _hex: string;
  _isBigNumber: boolean;
}

export const hexToNumber = ({ _hex, _isBigNumber }: HexToNumberParams) => {
  if (!_isBigNumber) {
    throw new Error(`_isBigNumber与预期不一致`);
  }
  if (isHex(_hex)) {
    throw new Error("_hex与预期不一致：" + _hex);
  }
  return utils.formatUnits(_hex, 18);
  // return new BigNumber(_hex).toNumber();
};

/**
 * 将BNB余额Hex转为数值
 * @param data
 */
export const getBnbNumberFromHex = (data: HexToNumberParams) => {
  return Number(hexToNumber(data));
  // return hexToNumber(data) / 1e18;
};
