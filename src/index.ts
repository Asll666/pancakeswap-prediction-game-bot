import { bet } from "./percent-game/bet";
import { BetType } from "./types/bet";
import { collect } from "./percent-game/collect";
import { getAllHistory } from "./percent-game/getBetHistory";

// console.log(getDecimalAmount(new BigNumber(0.01)));

// bet({ position: BetType.BULL, amount: 0.001, gasRate: 2 });

// collect(10087);

getAllHistory().then((res) => console.log("asdasdasdasd", res));
