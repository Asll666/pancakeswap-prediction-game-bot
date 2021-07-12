import { MarketDataMonitor } from "./marketDataMonitor";
import { betSmall } from "./bet";
import { getUnCollectHistory } from "./getBetHistory";
import { collect } from "./collect";
import { getMultiplier } from "../utils/getMultiplier";
import { numberFixed, zeroFill } from "../utils/number";
import type { Round } from "../types/round";
import { calcBalanceTime, calcBalanceTimeMs } from "./round";
import * as chalk from "chalk";
import { log, color } from "../utils/log";
import BetManager from "./betManager";
import { getBalance } from "../wallet/wallet";

const calculateResult = (round: Round) => {
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

const onRoundBetsChang = (round: Round) => {
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
  // const balanceTime = calcBalanceTimeMs(round);
  const isUpSmall = bullMultiplier - bearMultiplier < 0;

  // if (balanceTime < 10000) {
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
  // }
};

getBalance().then((INITIAL_MONEY) => {
  // 在这里更改初始金额用于测试
  INITIAL_MONEY = 1;

  const betManager = new BetManager({
    initialMoney: INITIAL_MONEY,
    betEvent: async ({ betManager, round, counterparty }) => {
      if (betManager.currentBalance < 0 || round.totalAmount < 20) {
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

      // 真实投注行为！会使用钱包中的钱
      // ⚠️ This will use the balance in your wallet!

      // await betSmall({ round, amount });

      return {
        amount,
        id: round.id,
        position: betManager.getSmallPosition(round),
      };
    },
  });

  new MarketDataMonitor({
    nearsAnEndTime: 3000,
    onRoundChange: onRoundBetsChang,

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
        betManager.roundEndEvent(endRound);
        if (betManager.betHistory[endRound.id]) {
          log(
            `投注结算 场次 ${endRound.id} , 投注额 ${
              betManager.betHistory[endRound.id]
                ? betManager.betHistory[endRound.id].amount
                : "无"
            }, 当前金额: ${betManager.currentBalance}`
          );
        }
      }

      calculateResult(endRound);

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
      betManager.betEvent(round).then((res) => {
        if (res) {
          const { id, amount, position } = res;
          log(`投注 ${id} , 投注额 ${amount}, ${position}`);
        }
      });
      return true;
    },
  });
});
