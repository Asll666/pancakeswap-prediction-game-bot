import { getActiveBetRound } from "./getMarketData";
import type { Market, Round } from "../types/round";
import { sleep } from "../utils/promise-utils";
import { calcBalanceTime } from "./round";

type OnRoundChange = (round: Round) => any;

type OnRoundEnd = (round: Round, next: Round) => any;

type OnRoundStart = (round: Round, last: Round) => any;

export class MarketDataMonitor {
  // 当前对局
  currentRound: Round = null;
  // 上次对局
  lastRound: Round = null;
  // 轮询间隔周期
  pollingTime = 500;

  _onRoundChange: OnRoundChange;
  _onRoundEnd: OnRoundEnd;

  constructor({
    onRoundChange,
    onRoundEnd,
  }: {
    onRoundChange: OnRoundChange;
    onRoundEnd: OnRoundEnd;
  }) {
    this._onRoundChange = onRoundChange;
    this._onRoundEnd = onRoundEnd;
    this.polling();
  }

  callback(curRound: Round) {
    if (!this.currentRound) {
      this.currentRound = curRound;
    }

    if (!this.lastRound) {
      this.lastRound = curRound;
    }

    // 游戏场次发生变化
    // 说明上一场次游戏已经结束
    if (this.currentRound.id !== curRound.id) {
      this.lastRound = this.currentRound;
      this.currentRound = curRound;
      // 先回传上一次场次记录
      // 同时将此刻场次记录作为下一次场次回传
      this._onRoundEnd(this.lastRound, this.currentRound);
    }

    // 总投注数发生变化
    if (curRound.totalBets > this.currentRound.totalBets) {
      this.currentRound = curRound;
      // 通知订阅事件
      this._onRoundChange(curRound);
    }
  }

  /**
   * 设定
   * @param round
   * @param market
   */
  setPollingTime(round: Round, market: Market) {
    // 市场暂停，减缓请求频率
    if (market.paused) {
      return (this.pollingTime = 10000);
    }

    const balanceTime = calcBalanceTime(round);

    if (balanceTime > 100) {
      return (this.pollingTime = 5000);
    }

    if (balanceTime > 20) {
      return (this.pollingTime = 2000);
    }

    if (balanceTime > 10) {
      return (this.pollingTime = 500);
    }

    if (balanceTime > 5) {
      return (this.pollingTime = 300);
    }

    return (this.pollingTime = 100);
  }

  async polling(): Promise<any> {
    getActiveBetRound().then(({ round, market }) => {
      this.setPollingTime(round, market);
      return this.callback(round);
    });
    // 轮询器的间隔
    // 加速并发请求数量，所以不需要等上次结束
    await sleep(this.pollingTime);
    return this.polling();
  }
}

export default MarketDataMonitor;
