import { exec } from "child_process";
import { start } from "repl";
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
const START_TIME = config.scheduler.START_HOUR;
const STOP_TIME =  config.scheduler.STOP_HOUR;
const CHECK_INTERVAL_MIN = config.scheduler.CHECK_INTERVAL;
if(!START_TIME || !STOP_TIME || !CHECK_INTERVAL_MIN) {
  throw new Error("Please set START_HOUR, STOP_HOUR, and CHECK_INTERVAL in config.yaml");
}
var started = false;
function checkTimeAndControl() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  if ((day === 0 || day === 6) && started) {
    console.log("🛌 Weekend detected, stopping tronclass.");
    stopTronclass();
    started = false;
    return;
  }
  const isRunningTime = (hour >= START_TIME && hour < STOP_TIME);
  if (isRunningTime && !started) {
    startTronclass();
    started = true;
  }
  if(!isRunningTime && started) {
    stopTronclass();
    started = false;
  }
}

function startTronclass() {
  console.log(`[${new Date().toLocaleTimeString()}] 🟢 Starting ${TARGET}`);
  discordNotify(`[${new Date().toLocaleTimeString()}] 🟢 Starting ${TARGET}`);
  exec(`pm2 start example/example.js --name ${TARGET}`);
}

function stopTronclass() {
  console.log(`[${new Date().toLocaleTimeString()}] 🔴 Stopping ${TARGET}`);
  discordNotify(`[${new Date().toLocaleTimeString()}] 🔴 Stopping ${TARGET}`);
  exec(`pm2 stop ${TARGET}`);
}

checkTimeAndControl();
setInterval(checkTimeAndControl, CHECK_INTERVAL_MIN * 60 * 1000);