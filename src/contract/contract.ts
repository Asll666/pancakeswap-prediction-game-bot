import { predictionsAbi } from "../utils/getMethod";
import { wallet } from "../wallet/wallet";
import { Contract } from "ethers";

export const contractWithSigner = new Contract(
  "0x516ffd7D1e0Ca40b1879935B2De87cb20Fc1124b",
  predictionsAbi,
  wallet
);
