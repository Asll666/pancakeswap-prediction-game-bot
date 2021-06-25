import { MarketDataMonitor } from "./marketDataMonitor";
import { BetResponseCode, betSmall } from "./bet";
import { getUnCollectHistory } from "./getBetHistory";
import { collect } from "./collect";
import { getMultiplier } from "../utils/getMultiplier";
import { numberFixed, zeroFill } from "../utils/number";
import type { Round } from "../types/round";
import { calcBalanceTime } from "./round";
import * as chalk from "chalk";

let testBetTime = 10;

let betObject: { [key: string]: Round } = {};

new MarketDataMonitor({
  onRoundChange: (round) => {
    const { totalAmount, id } = round;

    const decimalLen = 2;
    const bullMultiplier = getMultiplier(
      round.totalAmount,
      round.bullAmount,
      decimalLen
    );
    const bearMultiplier = getMultiplier(
      round.totalAmount,
      round.bearAmount,
      decimalLen
    );

    const isUpSmall = bullMultiplier - bearMultiplier < 0;

    const color = (focus: boolean, str: any) => (focus ? chalk.blue(str) : str);

    console.log(
      `#${id} 数据变动，总计${round.totalBets}次$${zeroFill(
        numberFixed(totalAmount, 3),
        3
      )}`,
      `| 赔率 大`,
      color(isUpSmall, zeroFill(bullMultiplier, decimalLen)),
      "-",
      color(!isUpSmall, zeroFill(bearMultiplier, decimalLen)),
      `小`,
      `| ${calcBalanceTime(round)}s`
    );

    if (totalAmount > 69 && testBetTime > 0) {
      // 如果没有投注过，则尝试投注
      if (!betObject[round.id]) {
        betSmall({ amount: 0.1, round })
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

          collect(Number(cur.round.id))
            .then(() => {
              // 如果有赢就回收
              console.log("🤩🤩🤩🤩🤩🤩🤩成功回收！");
            })
            .catch(() => {
              console.error("😥失败回收!");
            });
        }
      }
    });
  },

  onNearsAnEnd: (round, time) => {
    if (time < 2000) {
      console.log(round.id, "即将结束，剩余1500ms");
      return true;
    }
    return false;
  },
});
