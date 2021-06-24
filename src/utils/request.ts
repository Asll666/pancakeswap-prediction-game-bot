import { GraphQLClient } from "graphql-request";
import type { RequestDocument, Variables } from "graphql-request/dist/types";
import axios, { AxiosProxyConfig } from "axios";
import config from "../config/config";

export function request<T = any, V = Variables>(
  url: string,
  document: RequestDocument,
  variables?: V
): Promise<T> {
  return axios({
    method: "post",
    url,
    proxy: config.proxy,
    headers: {
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
      "user-agent": `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.106 Safari/537.36`,
    },
    data: {
      query: document,
      variables,
    },
  })
    .then((res) => {
      return res.data.data;
    })
    .catch((err) => {
      console.error(url + "请求异常\r\n", err.message);
    });

  const client = new GraphQLClient(url, { fetch: axios });

  return client.request(document, variables);
}
