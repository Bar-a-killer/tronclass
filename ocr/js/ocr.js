// ocr.js (Final version for Node.js ESM)

// 導入 Node.js 專用的依賴
import fs from 'fs/promises'; // 用於讀取本地檔案 (如 charset.js)
import path from 'path';      // 用於處理 Node.js 路徑
import { fileURLToPath } from 'url';
import { Image, createCanvas } from 'canvas'; // 用於圖像處理 (模擬 Canvas, Image)
import { JSDOM } from 'jsdom';         // 用於模擬 document, window
import fetch from 'node-fetch';       // 用於處理外部 URL 或 dataUrl
import * as ort from 'onnxruntime-node'; // ONNX Runtime 的 Node.js 專用版本

// 設置 __filename 和 __dirname (ESM 模組中需要手動設置)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 資源基礎路徑: 假設 model.bin 和 charset.js 位於 ocr.js 所在的目錄
const BASE = new URL('./', import.meta.url).href; // 確保 BASE 是 file:///.../js/

const MODEL_BIN = new URL('model.bin', BASE).href;

// 🚨 模擬瀏覽器全域物件 (ONNX Runtime Web 依賴這些全域變數) 🚨
// 雖然我們使用 ort-node，但 ocr.js 中的一些邏輯仍然依賴 window/document
const dom = new JSDOM();
global.document = dom.window.document;
global.window = dom.window;
global.self = dom.window;
global.location = { href: BASE };
global.ort = ort; // 將 ort-node 賦值給 global.ort

// -----------------------------------------------------
// 1. 載入 Charset (使用 fs 模組，修復 URL Scheme 錯誤)
// -----------------------------------------------------

let charset;
try {
    const charsetPath = fileURLToPath(new URL('charset.js', BASE));
    
    // 使用 fs.readFile 讀取本地檔案
    const charsetContent = await fs.readFile(charsetPath, { encoding: 'utf8' }); 
    
    // 執行 charset.js 腳本，將結果 (如 window.charset = [...]) 賦值到全域
    // 使用 global.window 是為了匹配原始程式碼的 window.charset 賦值
    eval(charsetContent); 
    charset = global.window.charset;
    if (!charset) {
        console.warn("Charset loaded but global.window.charset is undefined. Check charset.js content.");
    }
} catch (e) {
    if (e.code === 'ENOENT') {
        console.error(`Error: charset.js not found at ${fileURLToPath(new URL('charset.js', BASE))}`);
    } else {
        console.error("Failed to load or parse charset:", e.message);
    }
}


// -----------------------------------------------------
// 2. 核心邏輯 (移除 IIFE 和 window 依賴)
// -----------------------------------------------------

let sessionPromise = null;
async function ensureSession(){
    if (!sessionPromise){
        // 在 Node.js 中，我們直接使用 ort-node，不需要 loadScript 或 ensureDeps
        const modelPath = fileURLToPath(new URL('model.bin', BASE));
        
        // 載入模型 (ort-node 專用)
        sessionPromise = ort.InferenceSession.create(modelPath);
    }
    return sessionPromise;
}

async function imageDataUrlToImage(dataUrl){
    // 使用 node-fetch 載入 dataUrl
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error('Invalid image dataUrl');
    
    // 這裡的 Image 來自 'canvas'
    return new Promise((resolve, reject) => {
        const img = new Image(); 
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error(`Failed to load image from dataUrl: ${e}`));
        img.src = dataUrl;
    });
}

async function preprocess(dataUrl){
    const img = await imageDataUrlToImage(dataUrl);
    const targetH = 64;
    const targetW = Math.max(1, Math.floor((img.width * targetH) / Math.max(1, img.height)));
    
    // 創建 Canvas
    const canvas = createCanvas(targetW, targetH);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0, targetW, targetH);
    
    // 獲取 ImageData
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imageData.data;
    
    // 灰階轉換和歸一化
    const input = new Float32Array(targetW * targetH);
    for (let i=0, j=0; i<data.length; i+=4, j++){
        const gray = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
        // 原始模型的歸一化: (gray/255 - 0.5) / 0.5
        input[j] = (gray/255 - 0.5) / 0.5;
    }
    return { input, width: targetW };
}

function getCharset(){
    return charset;
}

async function infer(input){
    const session = await ensureSession();
    // 模型的輸入名稱已確認為 input1
    const tensor = new ort.Tensor('float32', input, [1, 1, 64, input.length / 64]); 
    const outputs = await session.run({ input1: tensor });
    
    // 檢查輸出張量名稱 (原始代碼使用 'output')
    const outputTensorName = session.outputNames.includes('output') ? 'output' : session.outputNames[0];
    
    const data = outputs[outputTensorName].data; // int indices
    const result = [];
    let last = 0;
    const chars = getCharset();
    
    if (!chars) {
        console.warn("Charset is missing. Cannot decode OCR results.");
        return "";
    }

    for (const v of data){
        if (v === last) continue;
        last = v;
        if (v !== 0) { // 0 通常是 CTC 模型中的 'blank' 符號
            if (chars[v] !== undefined) result.push(chars[v]);
        }
    }
    return result.join('');
}

/**
 * 執行驗證碼圖片的 OCR 辨識。
 * @param {string} dataUrl - 驗證碼圖片的 data URL (e.g., data:image/png;base64,...)
 * @returns {Promise<string>} 辨識出的文字。
 */
export async function ocr(dataUrl){
    try {
        const { input } = await preprocess(dataUrl);
        const text = await infer(input);
        return text || '';
    } catch (e) {
        console.error("OCR execution failed:", e);
        return "OCR_ERROR";
    }
}

// -----------------------------------------------------
// 3. 匯出 (ESM 格式)
// -----------------------------------------------------

// 導出主要功能為預設匯出
export default ocr;

// 可選: 也可以命名匯出，以便測試
// export { ocr }; 

// optional: start session creation early (在 Node.js 中不推薦，因為可能會阻塞主執行緒)
// try { ensureSession(); } catch(_){}