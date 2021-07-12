import { BetPosition, Round } from "../types/round";
import { getMultiplier } from "../utils/getMultiplier";
import { getReasonableLimit, getReasonablePrice } from "../contract/gas";
import { numberFixed } from "../utils/number";

interface BetHistory {
  amount: number;
  position: BetPosition;
  id: string;
}

interface BetResult extends BetHistory {
  isWin: boolean;
  counterparty: BetResult | null; // 对手回合
}

interface BetEventParams {
  round: Round;
  counterparty: BetResult | null; // 对手
  betManager: BetManager;
}

type BetEvent = (data: BetEventParams) => Promise<BetHistory | null>;

let MOCK_BET_GAS = 0.00086;

Promise.all([getReasonablePrice(), getReasonableLimit()]).then(
  ([price, limit]) => (MOCK_BET_GAS = numberFixed(price * limit, 8))
);

const MOCK_NORMAL_GAS = 0.00004;

export class BetManager {
  // 投注事件
  private _betEvent: BetEvent;

  // 初始金额
  initialMoney: number;
  // 当前余额
  currentBalance: number;
  // 投注记录
  betHistory: { [key: string]: BetResult } = {};
  // 金额记录
  balanceHistory: { id: string; money: number }[] = [];

  lastOneRound: Round | null = null;
  lastTwoRound: Round | null = null;

  constructor({
    initialMoney,
    betEvent,
  }: {
    initialMoney: number;
    betEvent: BetEvent;
  }) {
    this._betEvent = betEvent;
    this.currentBalance = initialMoney;
    this.initialMoney = initialMoney;
  }

  getResult(
    position: BetPosition,
    round: Round
  ): { isWin: boolean; multiplier: number } {
    // 为正数则为增长
    const isUp = round.closePrice > round.lockPrice;
    const bull = getMultiplier(round.totalAmount, round.bullAmount);
    const bear = getMultiplier(round.totalAmount, round.bearAmount);

    return {
      isWin:
        (isUp && position === BetPosition.BULL) ||
        (!isUp && position === BetPosition.BEAR),
      multiplier: isUp ? bull : bear,
    };
  }

  getBigPosition(round: Round) {
    const bull = getMultiplier(round.totalAmount, round.bullAmount);
    const bear = getMultiplier(round.totalAmount, round.bearAmount);

    return bull > bear ? BetPosition.BULL : BetPosition.BEAR;
  }

  getSmallPosition(round: Round) {
    const bull = getMultiplier(round.totalAmount, round.bullAmount);
    const bear = getMultiplier(round.totalAmount, round.bearAmount);

    return bull < bear ? BetPosition.BULL : BetPosition.BEAR;
  }

  betEvent(round: Round): Promise<BetHistory | null> {
    const counterparty =
      this.lastTwoRound && this.betHistory[this.lastTwoRound.id]
        ? this.betHistory[this.lastTwoRound.id]
        : null;
    return this._betEvent({
      betManager: this,
      counterparty,
      round,
    }).then((res) => {
      if (res) {
        this.betRecord({
          ...res,
          isWin: false,
          counterparty,
        });
      }
      return res;
    });
  }

  roundEndEvent(round: Round) {
    const { id } = round;
    if (!this.betHistory[id]) {
      return;
    }
    this.lastTwoRound = this.lastOneRound;
    this.lastOneRound = round;

    const bet = this.betHistory[id];
    const result = this.getResult(bet.position, round);

    if (result.isWin) {
      bet.isWin = true;
      this.recordBalanceWithWin(bet, round);
    }
  }

  /**
   * 投注记录
   * @private
   */
  private betRecord({ amount, id, position, isWin, counterparty }: BetResult) {
    this.currentBalance = this.currentBalance - (amount + MOCK_BET_GAS);

    this.betHistory[id] = {
      id,
      amount,
      position,
      isWin: false,
      counterparty,
    };

    this.balanceHistory.push({
      id,
      money: this.currentBalance,
    });
  }

  private recordBalanceWithWin(betHistory: BetHistory, round: Round) {
    const isUp = round.closePrice > round.lockPrice;
    // 计算时加入投注金额，来计算总结
    const multiplier = isUp
      ? getMultiplier(
          round.totalAmount + betHistory.amount,
          round.bullAmount + betHistory.amount
        )
      : getMultiplier(
          round.totalAmount + betHistory.amount,
          round.bearAmount + betHistory.amount
        );
    // 记录余额
    this.currentBalance =
      this.currentBalance + betHistory.amount * multiplier - MOCK_NORMAL_GAS;
  }
}

export default BetManager;
