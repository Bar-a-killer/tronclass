[English](./README.md) | 中文

# TronClass API

點名機二號。核心登入與破解邏輯改寫自 silvercow002 與 rlongdragon 的專案，感謝原作者提供的基礎。

> 腳本來源：[@silvercow002/tronclass-script](https://github.com/silvercow002/tronclass-script)、[@rlongdragon/tronclass-api](https://github.com/rlongdragon/tronclass-api)

---

## 功能特色

- 在指定的時間區間內定時掃描並自動完成數字點名
- 提供網頁介面（`client/`）管理設定與手動操作服務
- 完成點名或發生錯誤時透過 Discord Webhook 回報進度

---

## 專案結構

- `src/` - 核心登入與點名邏輯的 TypeScript 原始碼
- `dist/` - 編譯後的 JavaScript（執行 `npm run build` 後產生）
- `maincode/` - 主程式、排程器（`scheduler.js`）、通知模組與後端 API（`server.js`）
- `maincode/yamls/` - 設定檔目錄，`config.yaml` 為實際使用的設定（已加入 `.gitignore`），`config_sample.yaml` 為範例
- `client/` - 網頁管理介面原始碼（React + Vite）
- `ocr/` - 用於破解海大 TronClass 登入頁 CAPTCHA 的 OCR 模型
- `scripts/` - 輔助腳本（例如 `make help` 的說明文字）

---

## 快速開始

### 方法一：Windows 一鍵啟動（推薦給不熟悉指令列的使用者）

1. 安裝 [Node.js](https://nodejs.org/en/download/)
2. 下載或 clone 本專案
3. 雙擊執行根目錄的 `tronclass.bat`

`tronclass.bat` 會自動：安裝根目錄與 `client/` 的相依套件、編譯後端 TypeScript、啟動後端 API 與前端開發伺服器，並自動開啟瀏覽器進入網頁介面。關閉對應的命令視窗即可停止服務。

### 方法二：手動啟動（macOS / Linux，或想用指令列的 Windows 使用者）

有安裝 `make` 的情況下：

```bash
make install     # 安裝根目錄與 client 的所有依賴
make build       # 編譯 TypeScript 並打包前端
```

接著複製設定檔範本並填入你的帳號資訊：

```bash
cp maincode/yamls/config_sample.yaml maincode/yamls/config.yaml
```

沒有 `make` 也完全沒問題，用等效的 npm 指令即可：

```bash
npm install
cd client && npm install && cd ..
npm run build
npm run build:ui
```

### 啟動服務

| 情境 | 指令 |
| --- | --- |
| 只啟動後端 API | `make server`（等效 `npm run server`） |
| 只啟動前端開發伺服器 | `make ui`（等效 `npm run ui`） |
| 同時啟動前後端，並開放區網存取（適合用手機測試） | `make lan`（等效 `npm run lan`） |
| 透過 PM2 在背景常駐執行點名主程式與排程器 | `make start` |

啟動後端後打開瀏覽器進入網頁介面，即可在其中管理設定與手動觸發點名腳本。

---

## 設定檔說明（`maincode/yamls/config.yaml`）

```yaml
tron:
  TRON_USER: "你的帳號"
  TRON_PASS: "你的密碼"
  TRON_BASE_URL: "https://tronclass.ntou.edu.tw"
  TRON_INTERVAL: 5000        # 自動掃描頻率（毫秒），建議 10000-15000
scheduler:
  START_HOUR: 5              # 排程器開始運作的時間（24 小時制）
  STOP_HOUR: 18              # 排程器停止運作的時間
  CHECK_INTERVAL: 15         # 排程檢查間隔（分鐘）
webhook:
  webhook_url: "你的 Discord webhook 網址"
server:
  PORT: 3000                 # 後端 API 監聽的 port，可依需要修改
  MODE: single               # single = 單人自架（預設）；multi = 多人登入模式
```

Webhook 設定方式可參考 [Discord Webhook 教學](https://ninglab.com/Discord-Webhook-bot/)。

也可以直接透過網頁介面的設定頁編輯並儲存這份設定檔，不需手動編輯 YAML。

### 修改後端 port

直接修改 `config.yaml` 中 `server.PORT` 的值並重新啟動後端即可。前端已改為以相對路徑呼叫 API，並在正式部署時由後端同源提供靜態網頁，因此變更 port 後不需要另外調整前端設定；開發模式（`vite dev`）會在啟動時讀取同一份設定檔決定 API 代理目標。

---

## 👥 多人模式（登入 + 管理後台）

預設的 `single` 模式與原本完全相同：不需登入，設定存在 `config.yaml`，`tronclass.bat`、`make start` 等用法都不受影響。

想讓多人共用同一台伺服器時，把 `config.yaml` 的 `server.MODE` 改成 `multi`（或設定環境變數 `TRONCLASS_MODE=multi`）並重新啟動後端：

1. 第一次開啟網頁會要求建立**管理員帳號**，原本 `config.yaml` 裡的 Tronclass 帳號、時段與 Webhook 會自動匯入這個帳號。
2. 管理員在「管理後台」新增其他使用者（不開放自行註冊），把初始密碼交給對方；對方登入後可自行修改密碼。
3. 每位使用者在「控制面板」填寫自己的 Tronclass 帳密、運行時段與 Webhook，按「開啟自動點名」即可。

運作方式：

- 每位使用者各有一個 pm2 程序 `tc-<帳號>`（執行 `maincode/bot.js`），互不影響。
- 排程由後端每分鐘檢查一次，依各人的時段自動啟動 / 停止，因此**後端必須持續運行**，建議用 `npm run server:start` 交給 pm2 管理（停止：`npm run server:stop`）。
- 管理後台可以看到每個人的程序狀態、最後檢查時間、最近錯誤、記憶體用量，查看 / 清空各自的程式日誌，並查詢稽核紀錄（登入、登入失敗、設定變更、啟停、帳號管理）。
- 帳號資料、每人的設定與日誌存在 `maincode/data/`（已加入 `.gitignore`）。**Tronclass 密碼以明文保存**（與單人版的 `config.yaml` 相同），請確保伺服器本身的存取權限。
- 登入使用 HttpOnly Cookie；同一 IP 或帳號 15 分鐘內失敗 10 次會暫時鎖定。若放在 nginx 等反向代理後面，請設定 `TRUST_PROXY=1` 並使用 HTTPS。

---

## 在區網內測試（例如用手機開啟網頁介面）

```bash
make lan
```

此指令會同時啟動後端與前端（前端會開放給區網內其他裝置存取），並在終端機印出可供其他裝置連線的網址（`Network: http://<你的區網IP>:5173/`）。按下 `Ctrl+C` 即可同時關閉兩個服務。

正式部署（`make build` 後以 `make server` 啟動）時，其他裝置直接連線 `http://<你的區網IP>:<PORT>/` 即可，不需要額外啟動前端開發伺服器。

---

## 使用須知

海大 TronClass 於 2025/10/13 在登入畫面加入 reCAPTCHA，因此本專案加入了 OCR 辨識功能以繞過驗證。若不需要 OCR，可參考舊版 `index.ts` 的 `login` 函式；登入邏輯已模組化，理論上可替換為其他實作。

## 警告

本專案雖為開源專案，但若同時有過多使用者透過相同方式登入，仍可能造成校方系統負載增加，甚至導致登入介面調整後功能失效。請在合理範圍內使用（例如偶爾早八點名），不建議作為長期取代到課的手段。
