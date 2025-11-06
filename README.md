[中文](./README_zh-tw.md) | English

# TronClass API

This project is a **super hybrid** of various open-source codes — most of its logic is borrowed or adapted from other projects.
If you want to find the original sources, please contact **rlongdragon**.

> Main script sources: [@silvercow002/tronclass-script](https://github.com/silvercow002/tronclass-script), [@rlongdragon/tronclass-api](https://github.com/rlongdragon/tronclass-api)
> OCR model from [AutoVerify](https://chromewebstore.google.com/detail/autoverify/jgcfgcdociopaedpeiacalnccfiaeeej?hl=en)

---

## ✨ Features

* Periodically scans for rollcalls within a specified time interval
* Automatically solves **number rollcalls**
* Reports progress and status to **Discord**

---

## 📁 Directory Structure

* `src/` - TypeScript source code
* `dist/` - Compiled JavaScript output (after running `npm run build`)
* `example/` - Main logic folder (**todo:** rename this folder later)
* `ocr/` - OCR model used to solve the NTOU TronClass CAPTCHA

---

## 🚀 Quick Start

First, install **Node.js** and **npm**.

Then clone this repository and install dependencies:

```bash
npm install
npm run build
```

### Configure your TronClass credentials

You can either:

* Edit `example/example.js` directly and fill in your account info, **or**
* Create a `config.yaml` file in the `example/` folder with the following content:

```yaml
tron:
  TRON_USER: "accountname"
  TRON_PASS: "password"
  TRON_BASE_URL: "https://tronclass.ntou.edu.tw"
  TRON_INTERVAL: 10000
webhook: "https://your/discord/webhook"
```

Then start the scheduled rollcall service:

```bash
pm2 start example/scheduler.js --name tronclass-scheduler
```

---

## ⚙️ Usage Notes

Since **NTOU TronClass** added **reCAPTCHA** on its login page (as of *2025/10/13*),
this version includes **OCR-based text recognition** to bypass it.

If you don’t need OCR, you can refer to the **previous version** of `index.ts` and its `login` function.
The login logic has been modularized, so you can easily swap in **rlongdragon’s** older version of `index.ts` if you prefer.

---

## ⚠️ Warning

Although this project is open source,
**excessive simultaneous use** may cause TronClass servers to slow down or temporarily block access.
If the school updates the login system again, this program might stop working.
Please use it responsibly — it’s meant for occasional use (e.g., early morning rollcalls 😴),
not as a full-time replacement for class attendance.

Otherwise... maybe consider taking a semester off. 😅

translate by chatgpt