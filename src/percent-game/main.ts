import { MarketDataMonitor } from "./marketDataMonitor";
import { betSmall } from "./bet";
import { getUnCollectHistory } from "./getBetHistory";
import { collect } from "./collect";
import { getMultiplier } from "../utils/getMultiplier";
import { numberFixed, zeroFill } from "../utils/number";
import type { Round } from "../types/round";
import { calcBalanceTime, calcBalanceTimeMs } from "./round";
import * as chalk from "chalk";
import { log } from "../utils/log";
import BetManager from "./betManager";

const mockBetResult = (round: Round) => {
  const cur = round;
  const id = cur.id;
  // 为正数则为增长
  const isUp = cur.closePrice - cur.lockPrice > 0;

  const bull = getMultiplier(cur.totalAmount, cur.bullAmount);
  const bear = getMultiplier(cur.totalAmount, cur.bearAmount);

  console.log(
    `场次${id}结算结果为 ${chalk.red(isUp ? "大" : "小")} 赔率 ${chalk.blue(
      isUp ? bull : bear
    )}`
  );
};

const INITIAL_MONEY = 1;

const betManager2 = new BetManager({
  initialMoney: INITIAL_MONEY,
  betEvent: async ({ betManager, round, counterparty }) => {
    if (betManager.currentBalance < 0 || round.totalAmount < 10) {
      return null;
    }

    let amount = INITIAL_MONEY / 10;

    if (counterparty && !counterparty.isWin) {
      amount = counterparty.amount * 2.75;
    }

    if (amount > INITIAL_MONEY / 1.35) {
      amount = INITIAL_MONEY / 1.35;
    }

    if (amount > betManager.currentBalance) {
      amount = betManager.currentBalance;
    }

    // 仅仅保留8位尾数
    amount = numberFixed(amount, 8);

    // 真实投注行为！
    // await betSmall({ round, amount });

    return {
      amount,
      id: round.id,
      position: betManager.getSmallPosition(round),
    };
  },
});

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
    const balanceTime = calcBalanceTimeMs(round);
    const isUpSmall = bullMultiplier - bearMultiplier < 0;

    const color = (focus: boolean, str: any) => (focus ? chalk.blue(str) : str);

    if (balanceTime < 5000) {
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
    }
  },

  onRoundEnd: (endRound, processRound) => {
    if (!endRound) {
      return;
    }
    console.log(
      `========游戏结束，${endRound ? endRound.id : "NaN"}已停止结算, ${
        processRound ? processRound.id : "NaN"
      }开始计算========`
    );
    if (endRound) {
      betManager2.roundEndEvent(endRound);
      if (betManager2.betHistory[endRound.id]) {
        log(
          `投注结算2 场次 ${endRound.id} , 投注额 ${
            betManager2.betHistory[endRound.id]
              ? betManager2.betHistory[endRound.id].amount
              : "无"
          }, 当前金额: ${betManager2.currentBalance}`
        );
      }
    }
    mockBetResult(endRound);
    console.log(
      "回调与预期时间剩余",
      processRound ? calcBalanceTimeMs(processRound) : NaN,
      "ms"
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

  onNearsAnEnd: (round) => {
    console.log(
      new Date().toISOString(),
      round.id,
      `即将结束，剩余${(round.startAt + 5 * 60) * 1000 - Date.now()}ms`
    );

    betManager2.betEvent(round).then((res) => {
      if (res) {
        const { id, amount, position } = res;
        log(`投注场次2 ${id} , 投注额 ${amount}, ${position}`);
      }
    });
    return true;
  },
});
