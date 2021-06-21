import { contractWithSigner } from "../contract/contract";
import { getBSCScan } from "../utils/getBSCScan";

export const collect = (epoch: number) => {
  return contractWithSigner.functions
    .claim(epoch)
    .then((tx: any) => {
      console.log("🎉回收成功，链地址", getBSCScan(tx.hash), tx.hash);
      return tx.wait();
    })
    .catch((err: any) => console.error("回收失败", err));
};
