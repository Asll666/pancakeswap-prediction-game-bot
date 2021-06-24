import { MarketDataMonitor } from "./marketDataMonitor";
import { BetResponseCode, betSmall } from "./bet";
import { getUnCollectHistory } from "./getBetHistory";
import { collect } from "./collect";
import { getMultiplier } from "../utils/getMultiplier";
import { numberFixed, zeroFill } from "../utils/number";
import type { Round } from "../types/round";
import { calcBalanceTime } from "./round";

let testBetTime = 10;

let betObject: { [key: string]: Round } = {};

new MarketDataMonitor({
  onRoundChange: (round) => {
    const { totalAmount, id } = round;

    const decimalLen = 2;
    console.log(
      `#${id} 场次出现数据变动，当前总计投注${zeroFill(
        numberFixed(totalAmount, 3),
        3
      )}` +
        `| 赔率 大${zeroFill(
          getMultiplier(round.totalAmount, round.bullAmount, decimalLen),
          decimalLen
        )}-${zeroFill(
          getMultiplier(round.totalAmount, round.bearAmount, decimalLen),
          decimalLen
        )}小  |  ${calcBalanceTime(round)}s`
    );

    if (totalAmount > 40 && testBetTime > 0) {
      // 如果没有投注过，则尝试投注
      if (!betObject[round.id]) {
        betSmall({ amount: 0.005, round })
          .then((res) => {
            if (res.code === BetResponseCode.SUCCESS) {
              betObject[round.id] = round;
              console.log("😮😮😮😮😮😮😮😮投注成功", round.id);
              testBetTime--;
            } else {
              console.error("😡😡😡😡😡😡投注失败， 看上游！");
            }
          })
          .catch((err) => console.error("😡😡😡😡😡😡投注失败", err.message));
      } else {
        console.log("🧐已投注");
      }
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

  onNearsAnEnd: () => {
    return false;
  },
});
