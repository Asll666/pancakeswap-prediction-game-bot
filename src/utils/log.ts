import { appendFile } from "fs";
import { join } from "path";

export const log = (str: string) => {
  return new Promise<void>((resolve, reject) => {
    appendFile(
      join(__dirname, "../", "log.txt"),
      "\r\n" + str,
      "utf8",
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};
