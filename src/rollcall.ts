import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import { JSDOM } from "jsdom";
//@ts-ignore
import { discordNotify } from "../maincode/notify.js";
import Tronclass from "./index.js";
import fs from "fs";
import path from "path";
import ProgressBar from "progress";

class Rollcall {
  private tronclass: Tronclass;
  private PATH = "./logs"; // 預設 log 目錄
  private notifiedRollcalls: Set<number> = new Set();
  private failedRollcalls: Set<number> = new Set();
  private succeededRollcalls: Set<number> = new Set();

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


  /**
   * 數字點名處理函式
   * 流程：
   * 1. 查詢 student_rollcalls 詳情 API 獲取完整 Payload
   * 2. 透過 parseNumberCodePayload 解析是否有直接洩漏的 4 位數驗證碼
   * 3. 若有 -> 提交簽到並向後端確認狀態
   * 4. 若無或失敗 -> 不進行暴力破解，直接發送 Discord Webhook 通知失敗
   */
  private async number(rcid: number): Promise<string> {
    const logPath = `${this.PATH}/num/${rcid}.log`;
    const log = (entry: any) => this.log(logPath, entry, rcid);
    const device = this.randomId();

    console.log(`🔍 [Rollcall ${rcid}] Fetching student rollcalls detail...`);

    // -------------------------------------------------------------
    // 步驟 1: 查詢點名詳細資料 (對齊 Python 的 fetch_student_rollcalls)
    // -------------------------------------------------------------
    let detailPayload: any = null;
    try {
      // 嘗試常見的 TronClass 學生點名詳情路徑
      const detailResp = await this.tronclass.call(
        `/api/rollcall/${rcid}/student_rollcalls`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (detailResp.ok) {
        detailPayload = await detailResp.json();
      } else {
        // 部分站台端點為 /api/student/rollcalls/{rcid}
        const fallbackResp = await this.tronclass.call(
          `/api/student/rollcalls/${rcid}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );
        if (fallbackResp.ok) {
          detailPayload = await fallbackResp.json();
        }
      }
    } catch (e: any) {
      console.warn(`[Rollcall ${rcid}] Failed to fetch rollcall detail: ${e?.message}`);
    }

    // -------------------------------------------------------------
    // 步驟 2: 解析 Payload 中是否包含驗證碼
    // -------------------------------------------------------------
    const lookup = detailPayload ? this.extractNumberCode(detailPayload) : null;

    // -------------------------------------------------------------
    // 步驟 3: 若成功解析出驗證碼 -> 提交簽到
    // -------------------------------------------------------------
    if (lookup?.code) {
      const code = lookup.code;
      console.log(`✨ [Rollcall ${rcid}] Direct code found: ${code} (source: ${lookup.source})`);

      try {
        const resp = await this.tronclass.call(
          `/api/rollcall/${rcid}/answer_number_rollcall`,
          {
            method: "PUT",
            body: JSON.stringify({ deviceId: device, numberCode: code }),
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        const text = await resp.text();
        await log({
          status: resp.status,
          code,
          source: lookup.source,
          body: text.slice(0, 300),
          note: "direct_submit",
        });

        // 檢查簽到狀態是否已確認完成 (on_call_fine)
        const isSuccess = resp.status >= 200 && resp.status < 300;

        if (isSuccess) {
          this.succeededRollcalls.add(rcid);
          await discordNotify(`🎯 點名成功！代碼: **${code}** (Rollcall ID: ${rcid})`).catch(console.error);
          return code;
        }

        if (!this.failedRollcalls.has(rcid)) {
          this.failedRollcalls.add(rcid);
          await discordNotify(
            `❌ 點名失敗！已取得代碼 **${code}** 但提交遭到伺服器拒絕 (HTTP ${resp.status}) (Rollcall ID: ${rcid})`
          ).catch(console.error);
        }
        return "-1";
      } catch (e: any) {
        if (!this.failedRollcalls.has(rcid)) {
          this.failedRollcalls.add(rcid);
          await discordNotify(
            `⚠️ 提交代碼發生例外錯誤 (Code: ${code}, ID: ${rcid}): ${e?.message || String(e)}`
          ).catch(console.error);
        }
        await log({ code, error: e?.message || String(e), note: "submit_exception" });
        return "-1";
      }
    }

    // -------------------------------------------------------------
    // 步驟 4: 未能取得代碼 -> 砍掉爆破，直接 Webhook 報警 (僅通知一次)
    // -------------------------------------------------------------
    console.log(`❌ [Rollcall ${rcid}] No valid number_code in detail payload.`);
    if (!this.failedRollcalls.has(rcid)) {
      this.failedRollcalls.add(rcid);
      await discordNotify(
        `❌ **數字點名失敗**：無法從系統取得點名碼，且已停用暴力破解 (Rollcall ID: ${rcid})`
      ).catch(console.error);
    }

    await log({
      summary: true,
      success: false,
      code: "NA",
      note: "NO_DIRECT_CODE_ABORT",
    });

    return "-1";
  }

  /**
   * 對齊 Python parse_number_code_payload 的提取邏輯
   * 遞迴/深度檢查所有常見結構 (頂層、data、student_rollcalls 陣列等)
   */
  private extractNumberCode(payload: any): { code: string | null; source: string } {
    const coerce = (val: any): string | null => {
      if (val === null || val === undefined || typeof val === "boolean") return null;
      let s = String(val).trim();
      if (/^[0-9]{1,4}$/.test(s)) s = s.padStart(4, "0");
      return /^[0-9]{4}$/.test(s) ? s : null;
    };

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      // 1. 頂層
      let code = coerce(payload.number_code);
      if (code) return { code, source: "number_code" };

      // 2. data 或 rollcall 封裝層
      for (const key of ["data", "rollcall"] as const) {
        const sub = payload[key];
        if (sub && typeof sub === "object" && !Array.isArray(sub)) {
          code = coerce(sub.number_code);
          if (code) return { code, source: `${key}.number_code` };
        }
      }

      // 3. 陣列欄位 (student_rollcalls, data)
      for (const key of ["student_rollcalls", "data"] as const) {
        const list = payload[key];
        if (Array.isArray(list)) {
          for (const item of list) {
            code = coerce(item?.number_code);
            if (code) return { code, source: `${key}[].number_code` };
          }
        }
      }
    } else if (Array.isArray(payload)) {
      // 4. 回傳直接是陣列
      for (const item of payload) {
        const code = coerce(item?.number_code);
        if (code) return { code, source: "list[].number_code" };
      }
    }

    return { code: null, source: "" };
  }

  /**
   * 巡檢入口
   */
  public async checkRollcall(cnt = -1) {
    const resp = await this.tronclass.call(`/api/radar/rollcalls?api_version=1.1.0`);
    const json = await resp.json();

    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const d = today.getDate();

    await this.log(
      `${this.PATH}/${y}/${m}/${d}.log`,
      { url: resp.url, status: resp.status, data: json },
      cnt
    );

    let status = -1;

    if (json && Array.isArray(json.rollcalls) && json.rollcalls.length > 0) {
      // 維護現存點名集合，移除已結束的過期狀態
      const currentIds = new Set<number>(json.rollcalls.map((r: any) => r.rollcall_id));
      for (const id of this.notifiedRollcalls) {
        if (!currentIds.has(id)) this.notifiedRollcalls.delete(id);
      }
      for (const id of this.failedRollcalls) {
        if (!currentIds.has(id)) this.failedRollcalls.delete(id);
      }

      // 支援並行多門課程點名檢查
      for (const rollcall of json.rollcalls) {
        const id = rollcall.rollcall_id;

        if (rollcall.status === "on_call_fine") {
          console.log(`[Rollcall ${id}] Checked in (on_call_fine)`);
          this.succeededRollcalls.add(id);
          status = 0;
        } else if (this.succeededRollcalls.has(id)) {
          // 本地已確認簽到成功
          status = 0;
        } else if (rollcall.is_number) {
          if (this.failedRollcalls.has(id)) {
            // 已失敗過，不再每輪重複嘗試和洗版
            continue;
          }
          console.log(`[Rollcall ${id}] Start number rollcall`);
          if (!this.notifiedRollcalls.has(id)) {
            this.notifiedRollcalls.add(id);
            await discordNotify(`🔔 偵測到數字點名 (ID: ${id})，正在嘗試抓取代碼簽到...`).catch(console.error);
          }
          await this.number(id);
          status = 1;
        } else if (rollcall.is_radar) {
          console.log(`[Rollcall ${id}] Radar rollcall detected`);
          if (!this.notifiedRollcalls.has(id)) {
            this.notifiedRollcalls.add(id);
            await discordNotify(`📡 偵測到定位/雷達點名 (ID: ${id})，此模式需手動完成定位。`).catch(console.error);
          }
          status = 2;
        } else {
          console.log(`[Rollcall ${id}] QR code or other rollcall detected`);
          if (!this.notifiedRollcalls.has(id)) {
            this.notifiedRollcalls.add(id);
            await discordNotify(`📷 偵測到 QR Code 或其他點名 (ID: ${id})，需手動簽到。`).catch(console.error);
          }
          status = 3;
        }
      }
    } else {
      console.log("not call");
      status = -1;
    }

    return status;
  }
}
export default Rollcall;