export default {
  // 關鍵：這裡告訴 Tailwind 要掃描哪些檔案來尋找 CSS 類別
  content: [
    // 掃描 client/index.html
    "./index.html", 
    // 掃描 client/src/ 資料夾內所有 .js, .ts, .jsx, .tsx 檔案
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}