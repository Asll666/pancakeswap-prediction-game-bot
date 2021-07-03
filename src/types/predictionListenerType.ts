import type { BigNumberType } from "./BigNumberType";
import type { BetPosition } from "./round";

export interface PredictionListenerType<T> {
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  removed: false;
  address: string;
  data: string;
  topics: string[];
  transactionHash: string;
  logIndex: number;
  removeListener: () => void;
  getBlock: () => void;
  getTransaction: () => void;
  getTransactionReceipt: () => void;
  event: string;
  eventSignature: string;
  decode: () => void;
  args: T;
}

export type BetListenerEvent = (
  from: string,
  roundId: BigNumberType,
  value: BigNumberType,
  detail: PredictionListenerType<
    [
      // @ts-ignore
      string,
      BigNumberType[],
      BigNumberType[],
      sender: string,
      currentEpoch: BigNumberType[],
      amount: BigNumberType[]
    ]
  >,
  position: BetPosition
) => any;

export type StartRoundListenerType = (
  roundId: BigNumberType,
  blockNumber: BigNumberType,
  detail: PredictionListenerType<
    [
      // @ts-ignore
      [BigNumberType],
      [BigNumberType],
      epoch: [BigNumberType],
      blockNumber: [BigNumberType]
    ]
  >
) => any;

export type LockRoundListenerType = (
  roundId: BigNumberType,
  blockNumber: BigNumberType,
  lockPrice: BigNumberType,
  detail: PredictionListenerType<
    [
      // @ts-ignore
      [BigNumberType],
      [BigNumberType],
      [BigNumberType],
      epoch: [BigNumberType],
      blockNumber: [BigNumberType],
      price: [BigNumberType]
    ]
  >
) => any;

export type CloseRoundListenerType = (
  roundId: BigNumberType,
  blockNumber: BigNumberType,
  closePrice: BigNumberType,
  detail: PredictionListenerType<
    [
      // @ts-ignore
      [BigNumberType],
      [BigNumberType],
      [BigNumberType],
      epoch: [BigNumberType],
      blockNumber: [BigNumberType],
      price: [BigNumberType]
    ]
  >
) => any;
