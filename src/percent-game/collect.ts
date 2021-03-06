import { contractWithSigner } from "../contract/contract";
import { getBSCScan } from "../utils/getBSCScan";


export const collect = (epoch: number) => {
  return contractWithSigner.functions
    .claim(epoch)
    .then((tx: any) => {
      console.log("πεζΆζεοΌιΎε°ε", getBSCScan(tx.hash), tx.hash);
      return tx.wait();
    })
    .catch((err: any) => console.error("εζΆε€±θ΄₯", err));
};
