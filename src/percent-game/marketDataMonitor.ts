import { getActiveBetRound } from "./getMarketData";
import type { Market, Round } from "../types/round";
import { sleep } from "../utils/promise-utils";
import { calcBalanceTime, calcBalanceTimeMs } from "./round";

type OnRoundChange = (round: Round) => any;

type OnRoundEnd = (round: Round, next: Round) => any;

type OnRoundStart = (round: Round, last: Round) => any;

type OnNearsAnEnd = (round: Round, time: number) => boolean;

export class MarketDataMonitor {
  // 当前对局
  currentRound: Round = null;
  // 上次对局
  lastRound: Round = null;
  // 轮询间隔周期
  pollingTime = 500;

  _onRoundChange: OnRoundChange;
  _onRoundEnd: OnRoundEnd;
  _onNearsAnEnd: OnNearsAnEnd;
  private nearsAnEndAlarmMap: { [key: string]: boolean } = {};

  constructor({
    onRoundChange,
    onRoundEnd,
    onNearsAnEnd,
  }: {
    onRoundChange: OnRoundChange;
    onRoundEnd: OnRoundEnd;
    onNearsAnEnd: OnNearsAnEnd;
  }) {
    this._onRoundChange = onRoundChange;
    this._onRoundEnd = onRoundEnd;
    this._onNearsAnEnd = onNearsAnEnd;
    this.polling();
  }

  /**
   * 投注对局数据变化回调
   * @param curRound
   */
  dataChangeCallback(curRound: Round) {
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
   * 对局即将结束回调
   */
  nearsAnEndCallback() {
    const round = this.currentRound;
    const balanceTime = calcBalanceTimeMs(round);
    if (balanceTime < 3000 && !this.nearsAnEndAlarmMap[round.id]) {
      // 如果回调返回为true，则同场次不再调用回调
      if (this._onNearsAnEnd(round, balanceTime)) {
        this.nearsAnEndAlarmMap[round.id] = true;
        console.log("停止记录", round.id);
      }
    }
  }

  /**
   * 设定
   * @param market
   */
  setPollingTime(market: Market) {
    // 市场暂停，减缓请求频率
    if (market.paused) {
      return 10000;
    }

    const balanceTime = calcBalanceTime(this.currentRound);

    if (balanceTime > 100) {
      return 5000;
    }

    if (balanceTime > 20) {
      return 2000;
    }

    if (balanceTime >= 5) {
      return 300;
    }

    if (balanceTime < 5 && balanceTime > -10) {
      return 100;
    }

    // 常规情况下
    return 300;
  }

  async polling(): Promise<any> {
    // const now = Date.now();
    getActiveBetRound().then(({ round, market }) => {
      this.dataChangeCallback(round);
      this.nearsAnEndCallback();
      this.pollingTime = this.setPollingTime(market);
      // console.log("callback time: ", Date.now() - now);
    });
    // 轮询器的间隔
    // 加速并发请求数量，所以不需要等上次结束
    await sleep(this.pollingTime);
    return this.polling();
  }
}

export default MarketDataMonitor;
