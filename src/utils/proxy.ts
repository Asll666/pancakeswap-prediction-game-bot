import axios from "axios";
import config from "../config/config";
import type { ProxyType } from "../types/proxyType";

let token = "";

interface ResponseType<T> {
  code: number;
  errno: number;
  msg: string;
  data: T;
}

// token返回值
type TokenResType = ResponseType<{
  token: string;
}>;

// 代理类型
interface ThirdProxyType {
  geo: string; //国家
  ip: string; //代理ip
  port: number; //代理端口
  d_ip: string; //目标ip
  timeout: number; //有效时间（秒）
}

// 代理返回值
type ProxyListType = ResponseType<ThirdProxyType[]>;

const getToken = async () => {
  if (token) {
    return token;
  }

  return axios
    .get<TokenResType>("http://dvapi.doveip.com/cmapi.php?rq=login", {
      params: {
        // user: config.proxy.account,
        // password: config.proxy.password,
      },
    })
    .then((res) => {
      if (
        res.status === 200 &&
        (res.data.code === 200 || res.data.errno === 200)
      ) {
        token = res.data.data.token;
        console.log("token", token);
        return token;
      }

      throw new Error(res.data.msg);
    });
};

/**
 * 获取代理
 */
export const getProxy = async (): Promise<ProxyType[]> => {
  const token = await getToken();

  return axios
    .get<ProxyListType>("http://dvapi.doveip.com/cmapi.php?rq=distribute", {
      params: {
        // user: config.proxy.account,
        token,
        geo: "ph",
        accurate: 0,
        selfip: 0,
        timeout: 5,
        auth: 0,
        agreement: 1,
        repeat: 0,
        num: 10,
      },
    })
    .then((res) => {
      if (
        res.status == 200 &&
        (res.data.code === 200 || res.data.errno === 200)
      ) {
        console.log("获取IP列表", res.data.data);
        const data: ProxyType[] = res.data.data.map((item) => ({
          endTime: Date.now() + item.timeout, // 剩余时间
          port: item.port, // 端口
          ip: item.ip, // IP地址
        }));
        return data;
      }

      throw new Error(res.data.msg);
    });
};
