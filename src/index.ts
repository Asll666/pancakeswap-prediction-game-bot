import "./percent-game/main";

// import {graphRequest} from "./utils/request";
import { utils } from "ethers";
const { formatUnits } = utils;
import BigNumber from "bignumber.js";

// import { contractWithSigner } from "./contract/contract";
//
// contractWithSigner.on("LockRound", function (from) {
//   console.log(Math.floor(Date.now() / 1000) + "has LockRound!!", arguments);
// });
//
// contractWithSigner.on("EndRound", function (r, a, c, detail) {
//   console.log(
//     Math.floor(Date.now() / 1000) + "End",
//     formatUnits(r, 0),
//     formatUnits(a, 0),
//     formatUnits(c, 8),
//     typeof detail.args[3],
//     detail.args[3],
//     detail.args
//   );
// });
//
// contractWithSigner.on("StartRound", function (params) {
//   console.log(Math.floor(Date.now() / 1000) + "has StartRound!", arguments);
// });

// contractWithSigner.on("Claim", function (params) {
//   console.log("on Claim ", arguments);
// });

// import { bet } from "./percent-game/bet";
// import { BetType } from "./types/bet";
//
// bet({
//   position: BetType.BEAR,
//   amount: 0.005,
//   gasRate: 1.2,
// });
