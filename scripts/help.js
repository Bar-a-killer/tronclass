// scripts/help.js - UTF-8 help display for Makefile
const helpText = `
==========================================================
 TronClass API + Rollcall Bot - 可用指令列表
==========================================================

[依賴管理]
  make install     - 安裝後端與前端所有依賴 (root 及 client)

[建置與編譯]
  make build       - 完整編譯專案 (TypeScript 及 前端 Vite UI)
  make build-ts    - 僅編譯後端 TypeScript (tsc to dist/)
  make build-ui    - 僅打包前端 Vite UI (client/dist/)
  make build-pkg   - 打包為獨立執行檔 (pkg)

[開發與執行]
  make dev         - 使用 ts-node 啟動開發模式
  make server      - 啟動 Express 後端 API 服務 (Port 3000)
  make ui          - 啟動前端 Vite 開發伺服器 (Port 5173)
  make main        - 直接在前台運行巡檢點名主程式

[PM2 背景服務管理]
  make start       - 使用 PM2 啟動點名主程式與排程器
  make stop        - 使用 PM2 停止所有服務
  make reload      - 使用 PM2 重新載入所有服務
  make delete      - 使用 PM2 刪除所有已註冊服務
  make list        - 檢查目前 PM2 程序狀態
  make logs        - 查看 PM2 執行日誌

[清理]
  make clean       - 清除編譯產物 (dist/ 與 client/dist/)
`;

console.log(helpText);
