import { utils } from "ethers";
export const predictionsAbi: {
  name: string;
  type: string;
}[] = require("../config/abi/predictions.json");

export const abi: {
  methods: { [name: string]: string };
  events: { [name: string]: string };
} = { methods: {}, events: {} };

const iface = new utils.Interface(predictionsAbi);
const abiHumanReadable = iface.format(utils.FormatTypes.full);

for (let i = 0; i < predictionsAbi.length; i++) {
  const item = predictionsAbi[i];
  let type = item.type;
  if (item.name && type) {
    if (type === "function") {
      abi.methods[item.name] = abiHumanReadable[i];
    } else if (type === "event") {
      abi.events[item.name] = abiHumanReadable[i];
    }
  }
}

export const BetBear = iface.getFunction('betBear');
export const BetBull = iface.getFunction('betBull');

export default abi;
