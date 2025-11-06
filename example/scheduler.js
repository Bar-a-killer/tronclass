import { exec } from "child_process";
import { start } from "repl";
import { discordNotify } from "./notify.js";

const TARGET = "tronclass";
const START_TIME = 5;
const STOP_TIME = 18;
const CHECK_INTERVAL_MIN = 5;
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