import { exec } from "child_process";
import { discordNotify } from "./notify.js";

import fs from "fs";
import path from "path";
import YAML from "yaml";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = YAML.parse(
  fs.readFileSync(path.resolve(__dirname, "yamls/config.yaml"), "utf8")
);

const TARGET = "tronclass";
const START_TIME = config?.scheduler?.START_HOUR;
const STOP_TIME =  config?.scheduler?.STOP_HOUR;
const CHECK_INTERVAL_MIN = config?.scheduler?.CHECK_INTERVAL;

if (START_TIME === undefined || STOP_TIME === undefined || CHECK_INTERVAL_MIN === undefined) {
  throw new Error("Please set START_HOUR, STOP_HOUR, and CHECK_INTERVAL in config.yaml");
}

var started = false;

function checkTimeAndControl() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  if (day === 0 || day === 6) {
    if (started) {
      console.log("🛌 Weekend detected, stopping tronclass.");
      stopTronclass();
      started = false;
      return;
    }
  } else {
    // 支援跨夜排程 (例如 22 點至隔天 6 點)
    const isRunningTime = START_TIME <= STOP_TIME
      ? (hour >= START_TIME && hour < STOP_TIME)
      : (hour >= START_TIME || hour < STOP_TIME);

    if (isRunningTime && !started) {
      startTronclass();
      started = true;
    }
    if (!isRunningTime && started) {
      stopTronclass();
      started = false;
    }
  }
}

function startTronclass() {
  const timeStr = new Date().toLocaleTimeString();
  console.log(`[${timeStr}] 🟢 Starting ${TARGET}`);
  discordNotify(`[${timeStr}] 🟢 Starting ${TARGET}`).catch(console.error);
  // 若程序已存在則重啟，若不存在則新建啟動，避免程序重複或衝突
  exec(`pm2 restart ${TARGET} || pm2 start maincode/main.js --name ${TARGET}`, (err) => {
    if (err) console.error("pm2 start/restart error:", err.message);
  });
}

function stopTronclass() {
  const timeStr = new Date().toLocaleTimeString();
  console.log(`[${timeStr}] 🔴 Stopping ${TARGET}`);
  discordNotify(`[${timeStr}] 🔴 Stopping ${TARGET}`).catch(console.error);
  exec(`pm2 stop ${TARGET}`, (err) => {
    if (err) console.error("pm2 stop error:", err.message);
  });
}

checkTimeAndControl();
setInterval(checkTimeAndControl, CHECK_INTERVAL_MIN * 60 * 1000);