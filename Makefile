# ==============================================================================
# TronClass API and Rollcall Automation Makefile
# ==============================================================================

.DEFAULT_GOAL := help

.PHONY: help install build build-ts build-ui build-pkg dev ui server main start stop reload restart delete list status logs clean

## help: 顯示指令選單 (透過 Node.js 輸出，保證 UTF-8 中文不亂碼)
help:
	@node scripts/help.js

## install: 安裝根目錄與 client 所有依賴
install:
	@echo [INFO] Installing root dependencies...
	npm install
	@echo [INFO] Installing client dependencies...
	cd client && npm install

## build: 編譯後端 TypeScript 與打包前端 Vite UI
build: build-ts build-ui
	@echo [INFO] Build completed successfully.

## build-ts: 僅編譯 TypeScript
build-ts:
	@echo [INFO] Compiling TypeScript (tsc)...
	npm run build

## build-ui: 僅打包前端 Vite UI
build-ui:
	@echo [INFO] Building frontend UI (Vite)...
	npm run build:ui

## build-pkg: 打包為二進制獨立執行檔
build-pkg: build
	@echo [INFO] Packaging standalone binary (pkg)...
	npm run build:pkg

## dev: 執行開發模式
dev:
	npm run dev

## server: 啟動 Express 後端伺服器
server:
	npm run server

## ui: 啟動前端開發伺服器
ui:
	npm run ui

## main: 直接在前台運行主點名程式
main: build-ts
	npm run main

## start: 透過 PM2 背景啟動服務
start: build-ts
	@echo [INFO] Starting PM2 services (tronclass and tronclass-scheduler)...
	npm run start

## stop: 停止 PM2 服務
stop:
	@echo [INFO] Stopping PM2 services...
	npm run stop

## reload: 重新載入 PM2 服務
reload: build-ts
	@echo [INFO] Reloading PM2 services...
	npm run reload

restart: reload

## delete: 刪除 PM2 服務
delete:
	@echo [INFO] Deleting PM2 services...
	npm run delete

## list: 查看 PM2 服務清單
list:
	npm run list

status: list

## logs: 查看 PM2 即時日誌
logs:
	npm run logs

## clean: 清除編譯後的檔案
clean:
	@echo [INFO] Cleaning build artifacts...
	node -e "const fs = require('fs'); ['dist', 'client/dist'].forEach(p => { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); });"
	@echo [INFO] Clean completed.
