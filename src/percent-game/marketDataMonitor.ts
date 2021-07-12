import { getActiveBetRound } from "./getMarketData";
import type { Market, Round } from "../types/round";
import { BetPosition } from "../types/round";
import { accurateSetTimeout, sleep } from "../utils/promise-utils";
import { calcBalanceTime, calcBalanceTimeMs } from "./round";
import { contractWithSigner } from "../contract/contract";
import { utils } from "ethers";
import type {
  BetListenerEvent,
  CloseRoundListenerType,
  LockRoundListenerType,
  StartRoundListenerType,
} from "../types/predictionListenerType";
import {
  getCoinNumberFromHex,
  getIDFromHex,
  getPriceFromHex,
} from "../utils/money";
import {
  getBSCPending,
  getBSCCompleted,
  bscObservable,
  TransactionType,
} from "./getBSC";

const { parseUnits, formatUnits } = utils;

type OnRoundChange = (round: Round) => any;

type OnRoundEnd = (endRound: Round | null, processRound: Round | null) => any;

type OnRoundStart = (round: Round, last: Round) => any;

type OnNearsAnEnd = (round: Round) => boolean;

const getNowSeconds = () => Math.round(Date.now() / 1000);

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
  public nearsAnEndTime: number;
  // 对局记录
  private rounds: { [id: string]: Round } = {};
  private nearsAnEndAlarmMap: { [key: string]: boolean } = {};

  constructor({
    onRoundChange,
    onRoundEnd,
    onNearsAnEnd,
    nearsAnEndTime = 3000,
  }: {
    onRoundChange: OnRoundChange;
    onRoundEnd: OnRoundEnd;
    onNearsAnEnd: OnNearsAnEnd;
    nearsAnEndTime?: number;
  }) {
    this._onRoundChange = onRoundChange;
    this._onRoundEnd = onRoundEnd;
    this._onNearsAnEnd = onNearsAnEnd;
    this.nearsAnEndTime = nearsAnEndTime;
    // 以下三种只能选一个
    // 自建监听器( 推荐 )
    this.addBlockChainEvent();
    // 轮询BSC
    // this.pollingBSC();
    // 轮询GRT
    // this.pollingGRT();
  }

  /**
   * 投注对局数据变化回调
   * @param curRound
   */
  dataChangeCallback(curRound: Round) {
    if (!this.currentRound) {
      this.currentRound = curRound;
    }

    // if (!this.lastRound) {
    //   this.lastRound = curRound;
    // }

    // 游戏场次发生变化
    // 说明上一场次游戏已经结束
    if (this.currentRound.id !== curRound.id) {
      this.lastRound = this.currentRound;
      this.currentRound = curRound;
    }

    // 总投注数发生变化
    // if (curRound.totalBets > this.currentRound.totalBets) {
    //   this.currentRound = curRound;
    // 通知订阅事件
    this._onRoundChange(curRound);
    // }
  }

  /**
   * 对局即将结束回调
   */
  // nearsAnEndCallback() {
  //   const round = this.currentRound;
  //   const balanceTime = calcBalanceTimeMs(round);
  //   if (balanceTime < 3000 && !this.nearsAnEndAlarmMap[round.id]) {
  //     // 如果回调返回为true，则同场次不再调用回调
  //     if (this._onNearsAnEnd(round, balanceTime)) {
  //       this.nearsAnEndAlarmMap[round.id] = true;
  //     }
  //   }
  // }

  onChainBetEvent: BetListenerEvent = (
    from,
    roundId,
    value,
    detail,
    position
  ) => {
    const id = typeof roundId === "string" ? roundId : getIDFromHex(roundId);
    const cur = this.rounds[id];
    const num = typeof value === "number" ? value : getCoinNumberFromHex(value);
    // console.log("投注变更", id, num, detail.transactionHash, detail.blockHash);
    if (!cur) {
      // 暂未记录起始记录
      console.log("未匹配到本地记录", id);
      return;
    }

    cur.totalBets++;
    cur.totalAmount += num;
    if (position === BetPosition.BULL) {
      cur.bullBets++;
      cur.bullAmount += num;
    } else if (position === BetPosition.BEAR) {
      cur.bearBets++;
      cur.bearAmount += num;
    }
    this.dataChangeCallback(this.currentRound);
  };

  /**
   * 获取GRT查询时间
   */
  async getGRTDateTime(round: Round): Promise<{
    round: Round;
    market: Market;
  }> {
    const res = await getActiveBetRound();
    if (res.round.id !== round.id) {
      await sleep(2000);
      return this.getGRTDateTime(round);
    }
    return res;
  }

  /**
   * 对局启动，可下注
   */
  onChainRoundStart: StartRoundListenerType = (
    roundId,
    blockNumber,
    detail
  ) => {
    const id = getIDFromHex(roundId);
    console.log(new Date().toISOString(), "游戏开始", id);
    const round: Round = {
      bearBets: 0,
      bearAmount: 0,
      bullAmount: 0,
      bullBets: 0,
      id: id.toString(),
      totalAmount: 0,
      startAt: getNowSeconds(),
      totalBets: 0,
      lockPrice: null,
      closePrice: null,
      bets: [],
      endBlock: null,
      epoch: id,
      failed: false,
      lockAt: null,
      startBlock: detail.blockNumber,
      position: BetPosition.HOUSE,
      lockBlock: null,
    };
    this.rounds[id] = round;
    this.dataChangeCallback(round);
    this.getGRTDateTime(round).then((res) => {
      console.log(
        `本地记录时间 ${round.startAt} 与GRT时间 ${res.round.startAt}，偏差值${
          round.startAt - res.round.startAt
        }s`
      );
      // 修正时间
      round.startAt = res.round.startAt;
      // 快结束时触发一次回调
      accurateSetTimeout(
        () => this._onNearsAnEnd(round),
        (round.startAt + 5 * 60) * 1000 - Date.now() - this.nearsAnEndTime
      );
    });
  };

  /**
   * 对局锁定，禁止下注
   */
  onChainRoundLock: LockRoundListenerType = (
    roundId,
    blockNumber,
    lockPrice,
    detail
  ) => {
    const id = getIDFromHex(roundId);
    const block = getIDFromHex(blockNumber);
    const price = getPriceFromHex(lockPrice);
    console.log(new Date().toISOString(), "游戏锁定", id, "锁定", price);

    const cur = this.rounds[id];
    if (cur) {
      cur.lockPrice = price;
      cur.lockBlock = block;
      cur.lockAt = getNowSeconds();
    }
  };

  /**
   * 对局结束，看结果
   */
  onChainRoundEnd: CloseRoundListenerType = (
    roundId,
    blockNumber,
    closePrice,
    detail
  ) => {
    const id = getIDFromHex(roundId);
    const block = getIDFromHex(blockNumber);
    const price = getPriceFromHex(closePrice);
    const cur = this.rounds[id];
    console.log(
      new Date().toISOString(),
      "游戏结束",
      id,
      "结束价格",
      price,
      cur ? `锁定价格${cur.lockPrice}` : ""
    );

    if (cur) {
      cur.endBlock = block;
      cur.closePrice = price;
    }

    // 先回传上一次场次记录
    // 同时将此刻场次记录作为下一次场次回传
    this._onRoundEnd(cur || null, this.rounds[id + 1] || null);
  };

  addBlockChainEvent() {
    contractWithSigner
      .on("BetBull", (from, roundId, value, detail) =>
        this.onChainBetEvent(from, roundId, value, detail, BetPosition.BULL)
      )
      .on("BetBear", (from, roundId, value, detail) =>
        this.onChainBetEvent(from, roundId, value, detail, BetPosition.BEAR)
      )
      .on("EndRound", this.onChainRoundEnd)
      .on("LockRound", this.onChainRoundLock)
      .on("StartRound", this.onChainRoundStart);
  }

  pollingCallback(data: TransactionType) {
    if (this.currentRound) {
      this.onChainBetEvent(
        "",
        this.currentRound.id,
        data.value,
        null,
        data.position
      );
    }
  }

  async pollingBSC(): Promise<any> {
    bscObservable().subscribe((cur) => this.pollingCallback(cur));
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

  async pollingGRT(): Promise<any> {
    getActiveBetRound().then(({ round, market }) => {
      this.dataChangeCallback(round);
      this.pollingTime = this.setPollingTime(market);
    });
    // 轮询器的间隔
    // 加速并发请求数量，所以不需要等上次结束
    await sleep(this.pollingTime);
    return this.pollingGRT();
  }
}

export default MarketDataMonitor;
