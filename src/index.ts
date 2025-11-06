import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import ProgressBar from 'progress';
/**
 * Represents the response from a login attempt.
 * @interface
 * @property {boolean} success - Indicates if the login was successful.
 * @property {string} message - A message providing additional information about the login attempt.
 */



interface loginResponse {
  success: boolean;
  message: string;
}

class TronClass {
  baseUrl: string | undefined;
  private username: string | undefined;
  private password: string | undefined;
  private jar: CookieJar;
  private fetcher: typeof fetch;
  private loggedIn: boolean = false;
  private PATH = "./logs"; // 預設 log 目錄
  constructor() {
    this.jar = new CookieJar();
    this.fetcher = fetchCookie(fetch, this.jar);
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  public async login(
    username: string,
    password: string,
    ocr: (dataUrl: string) => Promise<string>
  ): Promise<loginResponse> {
    if (!username || !password) {
      return {
        success: false,
        message: "Username and password must be provided.",
      };
    }
    if (!this.baseUrl) {
      return {
        success: false,
        message: "Base URL is not set. Please call setBaseUrl first.",
      };
    }

    this.username = username;
    this.password = password;
    this.loggedIn = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // 第一步：發送 GET 請求獲取登入頁面，解析出 CSRF token (lt)
        const response = await this.fetcher(
          `${this.baseUrl}/login?next=/user/index`
        );
        const text = await response.text();

        const responseUrl = response.url;
        // cas baseurl
        const casBaseUrl = responseUrl.split(".tw/")[0] + ".tw";

        const dom = new JSDOM(text);
        // 使用可選鏈操作符 `?.` 安全地獲取值，並檢查其是否存在
        const lt = (
          dom.window.document.querySelector(
            'input[name="lt"]'
          ) as HTMLInputElement | null
        )?.value;

        // get captcha image data URL
        const imgRes = await this.fetcher(`${casBaseUrl}/cas/captcha.jpg?`);
        const arrayBuffer = await imgRes.arrayBuffer();
        const imgBuffer = Buffer.from(arrayBuffer);
        const base64Image = imgBuffer.toString("base64");

        const contentType = imgRes.headers.get("Content-Type");
        if (!contentType || !contentType.startsWith("image/")) {
          throw new Error("Captcha image not found or invalid content type.");
        }
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        const captchaCode = await ocr(dataUrl);

        // Check if captcha code is valid (4 digits)
        if (!/^\d{4}$/.test(captchaCode)) {
          console.error("Invalid captcha code. Must be 4 digits.");
          return {
            success: false,
            message: "Invalid captcha code. Must be 4 digits.",
          };
        }

        console.log("Captcha code received:", captchaCode);

        if (!lt) {
          throw new Error(
            "CSRF token 'lt' not found on the login page. Login page structure might have changed or access denied."
          );
        }

        const data = new URLSearchParams({
          username: this.username,
          password: this.password,
          captcha: captchaCode,
          lt: lt,
          execution: "e1s1",
          _eventId: "submit",
          submit: "登錄", // 登入按鈕的文字，可能因網站而異
        });

        console.log(casBaseUrl);
        const loginResponse = await this.fetcher(
          `${casBaseUrl}/cas/login?next=/user/index`,
          {
            method: "POST",
            body: data,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            redirect: "follow", // 自動跟隨 HTTP 重定向
          }
        );

        const loginText = await loginResponse.text();
        // 判斷登入是否成功的邏輯：如果響應包含 "forget-password" 字串，則認為登入失敗
        if (loginText.includes("forget-password")) {
          return {
            success: false,
            message: "Invalid username or password.",
          };
        }

        this.loggedIn = true;
        console.log(`Login successful for user: ${username}`);
        return { success: true, message: "Login successful." };
      } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (e) {
          // 處理登入憑證無效的錯誤
          if (attempt < 2) {
            console.warn(
              `Login attempt ${
                attempt + 1
              } failed for ${username}: ${errorMessage}. Retrying...`
            );
          } else {
            console.error(
              `Max retries reached! Login failed for ${username}: ${errorMessage}`
            );
            return {
              success: false,
              message: `Login failed after multiple attempts: ${errorMessage}`,
            };
          }
        } else {
          // 處理其他類型的錯誤（例如網路錯誤、JSDOM 解析錯誤等）
          if (attempt < 2) {
            console.error(
              `Login attempt ${
                attempt + 1
              } encountered an error for ${username}: ${errorMessage}. Retrying...`
            );
          } else {
            console.error(
              `Max retries reached! Login failed for ${username} due to an unexpected error: ${errorMessage}`
            );
            return {
              success: false,
              message: `Login failed after multiple attempts due to unexpected error: ${errorMessage}`,
            };
          }
        }
      }
    }
    // 如果迴圈結束後沒有成功返回，提供一個最終的失敗訊息
    return {
      success: false,
      message:
        "Login process completed without success or clear failure message.",
    };
  }

  /**
   * 發送一個經過認證的 API 請求到指定的端點。
   * 會透過內部 fetcher 自動處理 Cookie。
   * @param {string} endpoint - 要呼叫的 API 端點 (例如："/user/data")。
   * @param {RequestInit} [config={}] - 可選的 fetch 配置物件。
   * @returns {Promise<Response>} - 原始的 fetch Response 物件。
   * @throws {Error} 如果 baseUrl 未設定或未登入。
   */
  public async call(
    endpoint: string,
    config: RequestInit = {}
  ): Promise<Response> {
    if (!this.baseUrl) {
      throw new Error(
        "Base URL is not set. Please set it using setBaseUrl method before making API calls."
      );
    }

    // 檢查是否已登入。如果未登入且已儲存憑證，則嘗試自動重新驗證。
    if (!this.loggedIn) {
      if (this.username && this.password) {
      //   console.warn(
      //     "Session not active or expired. Attempting to re-authenticate automatically..."
      //   );
      //   // TODO: 這裡的 ocr 函數需要從外部傳入，或者有一個預設的處理方式
      //   // 目前暫時使用一個簡單的同步函數來避免錯誤
      //   // 這裡應該改成更合適的方式來處理 OCR
      //   const loginResult = await this.login(this.username, this.password, async ()=>{return "0000";});
      //   if (!loginResult.success) {
      //     throw new Error(
      //       `Automatic re-authentication failed: ${loginResult.message}. Please log in manually.`
      //     );
      //   }
      //   console.log("Automatic re-authentication successful.");
      // } else {
        throw new Error(
          "Not logged in and no credentials saved for re-authentication. Please call the login method first."
        );
      }
    }

    const fullUrl = `${this.baseUrl}${
      endpoint.startsWith("/") ? endpoint : `/${endpoint}`
    }`;
    const response = await this.fetcher(fullUrl, config);
    
    return response;
  }
  public IsloggedIn() {
    return this.loggedIn;
  }
  public recentlyVisitedCourses() {
    return this.call("/api/user/recently-visited-courses").then((res) =>
      res.json()
    );
  }

  // private async log(
  //   filePath: string,
  //   resp: { url?: string; status?: number; data?: any; summary?: boolean; code?: string; [key: string]: any }, // <- 加上 code 和任意屬性
  //   cnt: number = -1
  // ) {
  //   const timestamp = new Date().toISOString();
  //   const count = cnt ?? -1;

  //   let content = `${timestamp} | ${count}\n`;
  //   content += JSON.stringify(resp, null, 2) + "\n";

  //   fs.mkdirSync(path.dirname(filePath), { recursive: true });
  //   fs.appendFileSync(filePath, content, { encoding: "utf-8" });

  //   return true;
  // }

  // private randomId(length: number = 16): string {
  //   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  //   let result = "";
  //   for (let i = 0; i < length; i++) {
  //     result += chars.charAt(Math.floor(Math.random() * chars.length));
  //   }
  //   return result;
  // }


  // private async number(
  //   rcid: number,
  //   ses = 25,
  //   ran = 400,
  //   earlyStop = true // 找到正確碼就提前停止
  // ): Promise<string> {
  //   let attempts = 0;
  //   let foundCode = "-1";
  //   const device = this.randomId();
  //   const totalPlanned = Math.min(10000, ses * ran); // 最多4位數(0000~9999)

  //   // === 進度條 ===
  //   const bar = new ProgressBar(":bar :percent (:current/:total)", {
  //     total: totalPlanned,
  //     width: 40,
  //   });

  //   const logPath = `${this.PATH}/num/${rcid}.log`;
  //   const log = (entry: any) => this.log(logPath, entry, rcid);

  //   // === 安全解析回應 ===
  //   const safeParse = async (resp: Response) => {
  //     const url = (resp as any).url ?? "";
  //     const ct = resp.headers.get("content-type") || "";
  //     const text = await resp.text();
  //     let parsed: any = null;

  //     if (ct.includes("application/json")) {
  //       try {
  //         parsed = JSON.parse(text);
  //       } catch {
  //         parsed = { raw: text.slice(0, 300) };
  //       }
  //     } else if (text.trim().startsWith("<")) {
  //       parsed = { html: true, head: text.slice(0, 300) };
  //     } else {
  //       try {
  //         parsed = JSON.parse(text);
  //       } catch {
  //         parsed = { raw: text.slice(0, 300) };
  //       }
  //     }

  //     return { url, ct, text, data: parsed };
  //   };

  //   // === 早停旗標 ===
  //   let found = false;

  //   // === Worker ===
  //   const inner = async (sesId: number) => {
  //     for (let i = 0; i < ran; i++) {
  //       if (found && earlyStop) break; // 已找到則不繼續新請求
  //       const idx = sesId * ran + i;
  //       if (idx >= 10000) break; // 超過4位數上限

  //       const numberCode = idx.toString().padStart(4, "0");
  //       const payload = { deviceId: device, numberCode };

  //       let resp: any;
  //       try {
  //         resp = await this.call(
  //           `/api/rollcall/${rcid}/answer_number_rollcall`,
  //           {
  //             method: "PUT",
  //             body: JSON.stringify(payload),
  //             headers: {
  //               "Content-Type": "application/json",
  //               "Accept": "application/json",
  //             },
  //           }
  //         );

  //         const { url, ct, data, text } = await safeParse(resp);
  //         attempts += 1;
  //         if (attempts <= totalPlanned)
  //           bar.update(attempts / totalPlanned);

  //         // === 狀態分支 ===
  //         if (resp.status === 200) {
  //           foundCode = numberCode;
  //           found = true;
  //           await log({
  //             url,
  //             status: resp.status,
  //             ct,
  //             data,
  //             code: numberCode,
  //             note: "OK",
  //           });
  //           if (earlyStop) break;
  //         } else if (resp.status === 400) {
  //           await log({
  //             url,
  //             status: resp.status,
  //             ct,
  //             data,
  //             code: numberCode,
  //             note: "wrong code / 400",
  //           });
  //         } else {
  //           await log({
  //             url,
  //             status: resp.status,
  //             ct,
  //             head:
  //               typeof data === "object" && data?.html
  //                 ? data.head
  //                 : (text || "").slice(0, 300),
  //             code: numberCode,
  //             note: "non-200/400",
  //           });
  //         }
  //       } catch (e: any) {
  //         await log({
  //           url: resp?.url ?? "<no-url>",
  //           status: resp?.status ?? -1,
  //           code: numberCode,
  //           error: e?.message || String(e),
  //           note: "exception",
  //         });
  //         await new Promise((r) => setTimeout(r, 1200)); // 輕微退避
  //       }
  //     }
  //   };

  //   // === 啟動所有 worker ===
  //   const start = performance.now();
  //   await Promise.all(Array.from({ length: ses }, (_, i) => inner(i)));

  //   // === 總結 ===
  //   const spend = (performance.now() - start) / 1000;
  //   bar.terminate();
  //   console.log("🎯 Done!");
  //   console.log(
  //     `Total spend: ${spend}s, attempts: ${attempts}, last code: ${foundCode}`
  //   );

  //   await this.log(
  //     logPath,
  //     {
  //       summary: true,
  //       code: foundCode,
  //       spend_time: spend,
  //       attempts,
  //       opened_session: ses,
  //       request_per_session: ran,
  //       early_stop: !!earlyStop,
  //     },
  //     rcid
  //   );

  //   return foundCode;
  // }

  // public async checkRollcall(cnt = -1) {
  //   // 呼叫 rollcall API
  //   const resp = await this.call(`/api/radar/rollcalls?api_version=1.1.0`);
  //   const json = await resp.json();

  //   // 取當日日期（用於 log 檔名）
  //   const today = new Date();
  //   const y = today.getFullYear();
  //   const m = today.getMonth() + 1; // JS 月份從 0 開始
  //   const d = today.getDate();

  //   // 記錄 API 回應
  //   await this.log(`${this.PATH}/${y}/${m}/${d}.log`, {
  //     url: resp.url,
  //     status: resp.status,
  //     data: json,
  //   },cnt);

  //   let status;

  //   // 根據 rollcall 狀態決定要做的事
  //   if (json.rollcalls && json.rollcalls.length > 0) {
  //     const rollcall = json.rollcalls[0];

  //     if (rollcall.status === "on_call_fine") {
  //       console.log("rollcalled");
  //       status = 0;
  //     } else if (rollcall.is_number) {
  //       console.log("start num");
  //       const id = rollcall.rollcall_id;
  //       await this.number(id);
  //       status = 1;
  //     } else if (rollcall.is_radar) {
  //       console.log("start loc");
  //       status = 2;
  //     } else {
  //       console.log("maybe qrcode");
  //       status = 3;
  //     }
  //   } else {
  //     console.log("not call");
  //     status = -1;
  //   }

  //   return status;
  // }
}

export default TronClass;
