export const isHex = (str: string) => {
  return str.substring(0, 2) !== "0x";
};

export const getHexString = (str: string) => {
  let key = str;
  if (!isHex(str)) {
    key = "0x" + key;
  }
  return key;
};
