[English](./README.md) | 中文
# 這個項目的大部分code都是抄來的超級奇美拉，尋找原項目還請洽rlongdragon
# tronclass API

一個非官方的 TronClass（tronclass.com）API 工具庫，封裝登入、會話維護與常用 API 呼叫，方便在 Node.js / TypeScript 專案中自動化存取 TronClass 的使用者資料與課程資訊。
> 腳本來源 [@silvercow002/tronclass-script](https://github.com/silvercow002/tronclass-script),[@rlongdragon/tronclass-api](https://github.com/rlongdragon/tronclass-api)

>Ocr模型來源 [AutoVerefy](https://chromewebstore.google.com/detail/autoverify/jgcfgcdociopaedpeiacalnccfiaeeej?hl=zh-TW)
## 主要功能

- 使用 cookie jar 自動處理登入後的 session。
- 解析登入頁面以抓取 CSRF token（lt）並完成表單登入。
- 自動重試與簡單的錯誤處理機制。
- 提供簡單的包裝方法（例如 `recentlyVisitedCourses`）與通用的 `call` 方法以呼叫任意 API endpoint。

## 目錄

- `src/` - TypeScript 原始碼。
- `dist/` - 編譯後的 JavaScript（若已 build）。
- `example/` - 使用範例（`example/example.js`）。
- `ocr/` - ocr模型套件 用來解海大圖形辨識介面
## 快速開始
下載nodejs,npm

clone 此專案後
```bash
npm install
npm run build
```

在 `example/example.js` 中填入你的 TronClass 帳號密碼，然後執行範例：
```bash
npm run example
```
或在./下建立一個`.env`檔並填入帳號密碼、TronClass網址與期望間隔掃描時間，範例如下:
```bash
TRON_USER = "accountname"
TRON_PASS = "password"
TRON_BASE_URL = "https://tronclass.ntou.edu.tw"
TRON_INTERVAL = 10000
```
## 使用說明
因為此專案還沒上傳到 npm，你可以直接從本地路徑引入：

你可以先在其他資料夾建立一個新的 Node.js 專案，然後在 `package.json` 中加入以下依賴（請將路徑改成你本地的絕對路徑）：

因海大的 tronclass 在 2025/10/13 登入畫面加入了 reCAPTCHA，故更新 OCR 辨識文字功能。
你需要在登入的函數裡面添加 OCR 的參數，並且傳入一個能夠辨識圖片文字的函數。
如果你不需要 OCR ，可以參考此前版本 index.ts 的 login 函數。

```json
{
  "dependencies": {
    "tronclass-api": "file:/absolute/path/to/tronclass-api",
    "Ocr": "file:/absolute/path/to/tronclass-api/ocr"
  } 
}
```

然後在你的程式碼中這樣使用：

```javascript
import { Tronclass } from "tronclass-api";
import { captcha } from "Ocr";
(async () => {
  const tron = new Tronclass();
  const tron.setBaseUrl("https://tronclass.com"); // 你學校的 TronClass 網址
  await tron.login("your_username", "your_password", captcha);
  const courses = await tron.recentlyVisitedCourses();
  console.log(courses);
})();
```

