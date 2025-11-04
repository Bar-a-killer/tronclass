import Tronclass from "../dist/index.js";
import captcha from "../ocr/js/ocr.js";

import fs from "fs";
import path from "path";
import YAML from "yaml";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = YAML.parse(
  fs.readFileSync(path.resolve(__dirname, "config.yaml"), "utf8")
);
const username = config.tron.TRON_USER;
const password = config.tron.TRON_PASS;
const baseUrl = config.tron.TRON_BASE_URL;
const intervalMs = config.tron.TRON_INTERVAL;

if (!username)
  throw new Error("Please set the TRON_USER environment variable.");
if (!password)
  throw new Error("Please set the TRON_PASS environment variable.");
if (!baseUrl)
  throw new Error("Please set the TRON_BASE_URL environment variable.");

async function main() {
  const tronclass = new Tronclass();
  tronclass.setBaseUrl(baseUrl);
  await tronclass.login(username, password, captcha).then((loginResult) => {
    if (loginResult.success) {
      console.log("Login succeeded:", loginResult.message);
    } else {
      console.error("Login failed:", loginResult.message);
      return;
    }
  });
  //await tronclass.number(-1);
  // await tronclass.recentlyVisitedCourses().then((data) => {
  //   console.log("Recently visited courses:", data);
  // });

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  (async function poll() {
    var cnt = 0;
    for (;;) {
      try {
        await tronclass.checkRollcall(cnt++);
        console.log("Finished checking roll calls.");
      } catch (err) {
        console.error("Error checking roll calls:", err);
      }
      await sleep(intervalMs);
    }
  })();

}

main();
