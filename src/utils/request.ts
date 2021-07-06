import { GraphQLClient } from "graphql-request";
import type { RequestDocument, Variables } from "graphql-request/dist/types";
import axios, { AxiosProxyConfig, AxiosRequestConfig } from "axios";
import localConfig from "../config/config";
import { sleep } from "./promise-utils";
import userAgentList, { getRandomUA } from "./userAgentList";

const getRandomHeaders = () => {
  return {
    "Content-Type": "application/json",
    "user-agent": getRandomUA(),
  };
};

export function get<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T | null> {
  return axios
    .get(url, {
      proxy: localConfig.proxy,
      headers: getRandomHeaders(),
      ...(config || {}),
    })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.error(err);
      return null;
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
    proxy: localConfig.proxy,
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
