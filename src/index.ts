import { bet } from "./percent-game/bet";
import { BetType } from "./types/bet";

// console.log(getDecimalAmount(new BigNumber(0.01)));

bet({ position: BetType.BULL, amount: 0.001, gasRate: 2 });
