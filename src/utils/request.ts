import { GraphQLClient } from "graphql-request";
import type { RequestDocument, Variables } from "graphql-request/dist/types";
import axios, { AxiosProxyConfig } from "axios";
import config from "../config/config";
import { sleep } from "./promise-utils";

export const UA = `Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36`;

const getRandomHeaders = () => {
  return {
    // ":authority": `api.thegraph.com`,
    // ":method": `POST`,
    // ":path": `/subgraphs/name/pancakeswap/prediction`,
    // ":scheme": `https`,
    // accept: `*/*`,
    // "accept-encoding": `gzip, deflate, br`,
    // "cache-control": `no-cache`,
    "Content-Type": "application/json",
    // origin: `https://pancakeswap.finance`,
    // pragma: `no-cache`,
    // referer: `https://pancakeswap.finance/`,
    // "sec-ch-ua": `" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"`,
    // "sec-ch-ua-mobile": `?0`,
    // "sec-fetch-dest": `empty`,
    // "sec-fetch-mode": `cors`,
    // "sec-fetch-site": `cross-site`,
    "user-agent": UA,
  };
};

export function get<T>(url: string, params: any, headers?: any): Promise<T> {
  return axios({
    method: "get",
    url,
    proxy: config.proxy,
    headers: headers || getRandomHeaders(),
    // data: params,
    params,
  })
    .then((res) => {
      return res.data;
    })
    .catch(async (err) => {
      console.log("请求异常 ", url);
      await sleep(2000);
      // 异常尝试重新请求
      return graphRequest(url, params);
    });
}

export function graphRequest<T = any, V = Variables>(
  url: string,
  document: RequestDocument,
  variables?: V
): Promise<T> {
  return axios({
    method: "post",
    url,
    proxy: config.proxy,
    headers: getRandomHeaders(),
    data: {
      query: document,
      variables,
    },
  })
    .then((res) => {
      return res.data.data;
    })
    .catch(async (err) => {
      console.log("请求异常 ", url);
      await sleep(2000);
      // 异常尝试重新请求
      return graphRequest(url, document, variables);
    });
}
