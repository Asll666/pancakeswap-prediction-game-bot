const gasPrice = 0.000000007;
const gasLimit = 120000;

// Todo here
// 未来需要扩展为动态获取最新链上的推荐费率

export const getReasonablePrice = async (): Promise<number> => gasPrice;

export const getReasonableLimit = async (): Promise<number> => gasLimit;
