import { gql } from "graphql-request";
import { graphRequest } from "../utils/request";

import {
  BetResponse,
  getBetBaseFields,
  getUserBaseFields,
  getRoundBaseFields,
} from "../types/queries";
import { GRAPH_API_PREDICTION } from "../config/endpoints";
import config from "../config/config";

type BetHistoryWhereClause = Record<
  string,
  string | number | boolean | string[]
>;

export const getBetHistory = async (
  where: BetHistoryWhereClause = {},
  first = 3,
  skip = 0
): Promise<BetResponse[]> => {
  const response = await graphRequest(
    GRAPH_API_PREDICTION,
    gql`
          query getBetHistory($first: Int!, $skip: Int!, $where: Bet_filter) {
              bets(first: $first, skip: $skip, where: $where) {
                  ${getBetBaseFields()}
                  round {
                      ${getRoundBaseFields()}
                  }
                  user {
                      ${getUserBaseFields()}
                  }
              }
          }
      `,
    { first, skip, where }
  );
  return response.bets;
};

export enum HistoryFilter {
  ALL = "all",
  COLLECTED = "collected",
  UNCOLLECTED = "uncollected",
}

const getClaimParam = (historyFilter: HistoryFilter) => {
  switch (historyFilter) {
    case HistoryFilter.COLLECTED:
      return true;
    case HistoryFilter.UNCOLLECTED:
      return false;
    case HistoryFilter.ALL:
    default:
      return undefined;
  }
};

const user = config.account;

export const getAllHistory = () =>
  getBetHistory({
    user,
    claimed: getClaimParam(HistoryFilter.ALL),
  });

export const getUnCollectHistory = () =>
  getBetHistory(
    {
      user,
      claimed: getClaimParam(HistoryFilter.UNCOLLECTED),
    },
    20
  ).then(
    (data) => data.filter((item) => item.position === item.round.position) // 查询结果存在问题，需要过滤一次
  );
