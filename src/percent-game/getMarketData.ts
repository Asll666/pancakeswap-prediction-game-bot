import {
  getRoundBaseFields,
  MarketResponse,
  RoundResponse,
} from "../utils/queries";
import request, { gql } from "graphql-request";
import type { Bet, Market, Round } from "../types/round";
import { GRAPH_API_PREDICTION } from "../config/endpoints";
import { BetPosition } from "../types/round";
import type { BetResponse } from "../types/queries";

export const numberOrNull = (value: string) => {
  if (value === null) {
    return null;
  }

  const valueNum = Number(value);
  return Number.isNaN(valueNum) ? null : valueNum;
};

export const transformBetResponse = (betResponse: BetResponse): Bet => {
  const bet = {
    id: betResponse.id,
    hash: betResponse.hash,
    amount: betResponse.amount ? parseFloat(betResponse.amount) : 0,
    position:
      betResponse.position === "Bull" ? BetPosition.BULL : BetPosition.BEAR,
    claimed: betResponse.claimed,
    claimedHash: betResponse.claimedHash,
    user: {
      id: betResponse.user.id,
      address: betResponse.user.address,
      block: numberOrNull(betResponse.user.block),
      totalBets: numberOrNull(betResponse.user.totalBets),
      totalBNB: numberOrNull(betResponse.user.totalBNB),
    },
  } as Bet;

  if (betResponse.round) {
    bet.round = transformRoundResponse(betResponse.round);
  }

  return bet;
};

export const transformMarketResponse = (
  marketResponse: MarketResponse
): Market => {
  return {
    id: marketResponse.id,
    paused: marketResponse.paused,
    epoch: Number(marketResponse.epoch.epoch),
  };
};

export const transformRoundResponse = (roundResponse: RoundResponse): Round => {
  const {
    id,
    epoch,
    failed,
    startBlock,
    startAt,
    lockAt,
    lockBlock,
    lockPrice,
    endBlock,
    closePrice,
    totalBets,
    totalAmount,
    bullBets,
    bearBets,
    bearAmount,
    bullAmount,
    position,
    bets = [],
  } = roundResponse;

  const getRoundPosition = (positionResponse: string) => {
    if (positionResponse === "Bull") {
      return BetPosition.BULL;
    }

    if (positionResponse === "Bear") {
      return BetPosition.BEAR;
    }

    return null;
  };

  return {
    id,
    failed,
    epoch: numberOrNull(epoch),
    startBlock: numberOrNull(startBlock),
    startAt: numberOrNull(startAt),
    lockAt: numberOrNull(lockAt),
    lockBlock: numberOrNull(lockBlock),
    lockPrice: lockPrice ? parseFloat(lockPrice) : null,
    endBlock: numberOrNull(endBlock),
    closePrice: closePrice ? parseFloat(closePrice) : null,
    totalBets: numberOrNull(totalBets),
    totalAmount: totalAmount ? parseFloat(totalAmount) : 0,
    bullBets: numberOrNull(bullBets),
    bearBets: numberOrNull(bearBets),
    bearAmount: numberOrNull(bearAmount),
    bullAmount: numberOrNull(bullAmount),
    position: getRoundPosition(position),
    bets: bets.map(transformBetResponse),
  };
};

export const getMarketData = async (
  length = 5,
  skip = 0
): Promise<{
  rounds: Round[];
  market: Market;
}> => {
  const response = (await request(
    GRAPH_API_PREDICTION,
    gql`
        query getMarketData {
            rounds(first: ${length}, skip: ${skip}, orderBy: epoch, orderDirection: desc) {
                ${getRoundBaseFields()}
            }
            market(id: 1) {
                id
                paused
                epoch {
                    epoch
                }
            }
        }
    `
  )) as { rounds: RoundResponse[]; market: MarketResponse };

  return {
    rounds: response.rounds.map(transformRoundResponse),
    market: transformMarketResponse(response.market),
  };
};

/**
 * 获取当前可投注对局
 */
export const getActiveBetRound = () =>
  getMarketData(1).then((res) => res.rounds[0]);

/**
 * 获取当前进行中对局
 */
export const getProcessingRound = () =>
  getMarketData(2).then((res) => res.rounds[1]);
