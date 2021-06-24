import { MarketDataMonitor } from "./percent-game/marketDataMonitor";
import { BetResponseCode, betSmall } from "./percent-game/bet";
import { getUnCollectHistory } from "./percent-game/getBetHistory";
import { collect } from "./percent-game/collect";
import { getMultiplier } from "./utils/getMultiplier";
import { numberFixed } from "./utils/number";
import type { Round } from "./types/round";

let testBetTime = 10;

let betObject: { [key: string]: Round } = {};

new MarketDataMonitor({
  onRoundChange: (round) => {
    const { totalAmount, id } = round;

    console.log(
      `#${id} 场次出现数据变动，当前总计投注${numberFixed(totalAmount, 3)}` +
        `| 赔率 大${getMultiplier(
          round.totalAmount,
          round.bullAmount,
          2
        )}:${getMultiplier(round.totalAmount, round.bearAmount, 2)}小`
    );

    if (totalAmount > 40 && testBetTime > 0) {
      betSmall({ amount: 0.005, round })
        .then((res) => {
          if (res.code === BetResponseCode.SUCCESS) {
            console.log("😮😮😮😮😮😮😮😮投注成功", round.id);
            testBetTime--;
          } else {
            console.error("😡😡😡😡😡😡投注失败， 看上游！");
          }
        })
        .catch((err) => console.error("😡😡😡😡😡😡投注失败", err.message));
    }
  },
  onRoundEnd: (round, next) => {
    console.log(
      `========游戏结束，${round.id}已结束, ${next.id}已开始========`
    );

    getUnCollectHistory().then((res) => {
      if (res.length > 0) {
        for (let i = 0; i < res.length; i++) {
          const cur = res[i];
          // 如果有赢就回收
          console.log("🤩🤩🤩🤩🤩🤩🤩成功回收！");
          collect(Number(cur.id));
        }
      }
    });
  },
});
