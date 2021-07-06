import { get } from "../utils/request";
import { getRandomUA } from "../utils/userAgentList";
import cheerio, { Element } from "cheerio";
import { BetPosition } from "../types/round";
import { numberFixed, stringNumToNumber } from "../utils/number";
import type { AxiosRequestConfig } from "axios";
import dayjs = require("dayjs");
import { sleep } from "../utils/promise-utils";
import { log } from "../utils/log";
import type { CheerioAPI } from "cheerio/lib/load";
import { Observable, Subscriber, from, of, interval, merge } from "rxjs";
import { map, mergeMap, switchMap, take, filter, tap } from "rxjs/operators";
import { data } from "cheerio/lib/api/attributes";

const cacheStore: { [key: string]: { created: number; loaded: number } } = {};

/**
 * 重试延时
 */
const RETRY_DELAY = 500;

const RequestConfig: AxiosRequestConfig = {
  headers: {
    // ":authority": "bscscan.com",
    // ":method": "GET",
    // ":path": "/txsPending?a=0x516ffd7d1e0ca40b1879935b2de87cb20fc1124b",
    // ":scheme": "https",
    // accept:
    //   "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    // "accept-encoding": "gzip, deflate, br",
    // "cache-control": "no-cache",
    // pragma: "no-cache",
    // "sec-fetch-dest": "document",
    // "sec-fetch-mode": "navigate",
    // "sec-fetch-site": "none",
    // "sec-fetch-user": "?1",
    // "upgrade-insecure-requests": 1,
    "user-agent": getRandomUA(),
  },
  responseType: "document",
};

interface TransactionDetailType {
  datetime: string;
  timestamp: number;
  position: BetPosition;
  gasLimit: number;
  gasPrice: number;
}

interface TransactionBasicType {
  value: number;
  txn: string;
}

interface TransactionType extends TransactionDetailType, TransactionBasicType {}

/**
 * 详情列表迭代器
 * @param htmlStr
 * @param each
 */
const transactionTableEach = (
  htmlStr: string,
  each: (index: number, ele: Element, query: CheerioAPI) => any
) => {
  const matched = htmlStr.match(/<table[\s\S\n\r\t]+<\/table>/g);
  if (matched) {
    for (let i = 0; i < matched.length; i++) {
      const $ = cheerio.load(matched[i]);
      $("tbody tr").each(function (index, ele) {
        each(index, ele, $);
      });
    }
  }
};

/**
 * 获取pending中的交易数据
 * @param str
 */
const getPendingTransaction = (str: string): TransactionBasicType[] => {
  const result: TransactionBasicType[] = [];

  transactionTableEach(str, function (index, ele, $) {
    const children = $(ele).find("td");
    const value = stringNumToNumber(children.eq(7).text(), 12);
    // 只记录大于0的数据
    if (value > 0) {
      result.push({
        txn: children.eq(0).text().trim(),
        value,
      });
    }
  });
  return result;
};

/**
 * 获取完成的交易列表
 * @param htmlString
 */
const getCompletedTransactions = (
  htmlString: string
): TransactionBasicType[] => {
  const result: TransactionBasicType[] = [];
  transactionTableEach(htmlString, function (index, ele, $) {
    const children = $(ele).find("td");
    const value = stringNumToNumber(children.eq(8).text(), 12);
    // 只记录大于0的数据
    if (value > 0) {
      result.push({
        txn: children.eq(1).text().trim(),
        value,
      });
    }
  });
  return result;
};

/**
 * 获取交易详情数据
 * @param htmlString
 */
export const getTransactionDetail = (
  htmlString: string,
  txn: string,
  value: number
): TransactionType => {
  const $ = cheerio.load(htmlString);
  const main = $("#ContentPlaceHolder1_maintable");
  const position = (main.find("textarea").val() as string)
    .match(/Function:([^(\n\r\t]+)/)[1]
    .trim();

  let type: BetPosition;
  switch (position) {
    case "betBull":
      type = BetPosition.BULL;
      break;

    case "betBear":
      type = BetPosition.BEAR;
      break;

    default:
      type = BetPosition.HOUSE;
  }
  try {
    const datetime = main
      .find("#ContentPlaceHolder1_divTimeStamp .col-md-9")
      .text()
      .match(/\(([^)]+?[AP]M)/)[1]
      .trim();

    const gasPrice = stringNumToNumber(
      main
        .find("#ContentPlaceHolder1_spanGasPrice")
        .text()
        .match(/([\d.]+) *gwei/i)[1]
        .trim(),
      4
    );

    const gasLimit = stringNumToNumber(
      main.find("#ContentPlaceHolder1_spanGasLimit").text(),
      0
    );

    const date = dayjs(datetime).add(8, "hour");
    return {
      datetime: date.format(),
      timestamp: date.valueOf(),
      position: type,
      gasLimit,
      gasPrice,
      txn,
      value,
    };
  } catch (e) {
    console.log(
      "时间、GWEI、获取失败",
      main.find("#ContentPlaceHolder1_divTimeStamp .col-md-9").text()
    );
    console.log(htmlString);
    throw new Error(e.message);
  }
};

const requestTransitionDetail = (
  txn: string,
  value: number
): Promise<TransactionType> => {
  return get<string>(`https://bscscan.com/tx/${txn}`, RequestConfig).then(
    async (data) => {
      if (!data) {
        console.error("数据详情请求失败");
        await sleep(RETRY_DELAY);
        return requestTransitionDetail(txn, value);
      }
      try {
        return getTransactionDetail(data, txn, value);
      } catch (e) {
        console.error("匹配详情数据失败!");
        await sleep(RETRY_DELAY);
        return requestTransitionDetail(txn, value);
      }
    }
  );
};

const requestBSCTableList = (
  url: string,
  dataHandler: (htmlString: string) => TransactionBasicType[]
): Promise<TransactionType[]> => {
  return get<string>(url, RequestConfig).then(async (data) => {
    if (!data) {
      console.error(url + "数据请求失败，尝试重新获取!");
      await sleep(RETRY_DELAY);
      return requestBSCTableList(url, dataHandler);
    }
    let transitions: TransactionBasicType[];
    try {
      transitions = dataHandler(data).filter((item) => {
        // 只读取有记录的数据
        return !cacheStore[item.txn];
      });
    } catch (e) {
      console.log(url + "列表数据获取失败");
      log(data);
      await sleep(RETRY_DELAY);
      return requestBSCTableList(url, dataHandler);
    }

    const result: TransactionType[] = [];

    await Promise.all(
      transitions.map((item, index) => {
        return requestTransitionDetail(item.txn, item.value).then((res) => {
          // Todo here 这里需要做 cacheStore 的记录清理，防止数据过多内存溢出
          if (!cacheStore[item.txn]) {
            // 记录下时间戳
            cacheStore[item.txn] = {
              created: Date.now(),
              loaded: Date.now(),
            };
            result.push({
              ...transitions[index],
              ...res,
            });
          }
          return res;
        });
      })
    );

    return result;
  });
};

export const getBSCCompleted = (): Promise<TransactionType[]> => {
  return requestBSCTableList(
    "https://bscscan.com/txs?a=0x516ffd7d1e0ca40b1879935b2de87cb20fc1124b",
    getCompletedTransactions
  );
};

export const getBSCPending = (): Promise<TransactionType[]> => {
  return requestBSCTableList(
    "https://bscscan.com/txsPending?a=0x516ffd7d1e0ca40b1879935b2de87cb20fc1124b",
    getPendingTransaction
  );
};

// export const bscObservable = new Observable((subscriber) => {
//
// });

// interval(1000)
//   .pipe(
//     mergeMap((_) =>
//       from(
//         get<string>(
//           "https://bscscan.com/txs?a=0x516ffd7d1e0ca40b1879935b2de87cb20fc1124b",
//           RequestConfig
//         ).then((data) => getCompletedTransactions(data))
//       ).pipe(
//         switchMap((data) => data),
//         filter((value, index) => index < 3),
//         mergeMap((data) => from(requestTransitionDetail(data.txn)))
//       )
//     )
//   )
//   .subscribe((asd) => {
//     console.log("asd", asd);
//   });

const createPollingListObservable = (
  time: number,
  url: string,
  dataHandler: (htmlString: string) => TransactionBasicType[],
  type = false
) => {
  return interval(time).pipe(
    mergeMap((_) =>
      from(get<string>(url, RequestConfig).then((data) => dataHandler(data)))
    ),
    // tap(() => console.log("发起请求")),
    switchMap((data) => data),
    filter((data) => !cacheStore[data.txn]),
    tap((data) => {
      // if (type) {
      //   console.log("获取pending数据");
      // }
      cacheStore[data.txn] = { created: Date.now(), loaded: 0 };
    })
  );
};

export const bscObservable = () => {
  const pollingCompleted$ = createPollingListObservable(
    2000,
    "https://bscscan.com/txs?a=0x516ffd7d1e0ca40b1879935b2de87cb20fc1124b",
    getCompletedTransactions
  );

  const pollingPending$ = createPollingListObservable(
    1000,
    "https://bscscan.com/txsPending?a=0x516ffd7d1e0ca40b1879935b2de87cb20fc1124b",
    getPendingTransaction,
    true
  );

  return merge(pollingCompleted$, pollingPending$).pipe(
    // tap((data) =>
    //   console.log(new Date().toLocaleString(), "获取数据", data.txn)
    // ),
    mergeMap((data) => from(requestTransitionDetail(data.txn, data.value))),
    // tap((data) =>
    //   console.log(
    //     new Date().toLocaleString(),
    //     "获取详情",
    //     data.txn,
    //     data.position,
    //     data.datetime
    //   )
    // )
  );
};

// bscObservable().subscribe(() => console.log("------------"));
