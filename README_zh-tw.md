[English](./README.md) | 中文
# 這個項目的大部分code都是抄來的超級奇美拉，尋找原項目還請洽rlongdragon
# tronclass API

點名機2號，大部分邏輯來自slivecow002，登入邏輯來自阿龍。
> 腳本來源 [@silvercow002/tronclass-script](https://github.com/silvercow002/tronclass-script),[@rlongdragon/tronclass-api](https://github.com/rlongdragon/tronclass-api)

>Ocr模型來源 [AutoVerefy](https://chromewebstore.google.com/detail/autoverify/jgcfgcdociopaedpeiacalnccfiaeeej?hl=zh-TW)
## 主要功能

- 在規定時間中定時掃描是否點名
- 自動破解數字點名
- Discord回報進度

## 目錄

- `src/` - TypeScript 原始碼。
- `dist/` - 編譯後的 JavaScript（若已 build）。
- `example/` - 主要邏輯(todo : 改掉這個資料夾名稱)。
- `ocr/` - ocr模型套件 用來解海大圖形辨識介面
## 快速開始
下載nodejs,npm

啟動tronclass.bat

填入你的帳號密碼
tronclass網址
自動掃描頻率(推薦10000-15000)
程式啟動時間(24時制所以大概是早八到十七點)
程式自動啟動的刷新時間(推薦15-60)
webhook
(webhook部分可以參考[webhook教學](https://ninglab.com/Discord-Webhook-bot/))

按下儲存

start:開始程序
list:檢查執行中的程序
stop:停止程序
delete:刪除程序

打開package.json可以發現我其實也有包一些不常用的東西，熟悉terminal可以使用
## 使用說明
因海大的 tronclass 在 2025/10/13 登入畫面加入了 reCAPTCHA，故更新 OCR 辨識文字功能。
如果你不需要 OCR ，可以參考此前版本 index.ts 的 login 函數。
而且我把登入邏輯隔離開了，所以理論上你可以把阿龍的舊版本替換掉index.ts來實現。

# 警告:雖然此機器是開源的，過多人同時使用依然可能導致服務塞住。圖資處更新登入介面後可能將無法破解，能上課還是盡量去上課，這玩意偶爾早八用就好。不然可以考慮休學。
