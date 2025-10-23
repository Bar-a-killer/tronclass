English | [中文](./README_zh-tw.md)
# The codes from this project are most from rlongdragon so you should go there to see the hole project
# tronclass API

An unofficial TronClass (tronclass.com) API library, encapsulating login, session maintenance, and common API calls to facilitate automated access to TronClass user data and course information in Node.js / TypeScript projects.
> Script source: [@silvercow002/tronclass-script](https://github.com/silvercow002/tronclass-script),[@rlongdragon/tronclass-api](https://github.com/rlongdragon/tronclass-api)

## Key Features

- Automatically handles sessions after login using a cookie jar.
- Parses the login page to extract the CSRF token (lt) and complete form-based login.
- Automatic retries and a simple error handling mechanism.
- Provides simple wrapper methods (e.g., `recentlyVisitedCourses`) and a generic `call` method to invoke any API endpoint.

## Directory Structure

- `src/` - TypeScript source code.
- `dist/` - Compiled JavaScript (if built).
- `example/` - Usage example (`example/example.js`).

## Quick Start

After cloning this project:
```bash
npm install
npm run build
```

Fill in your TronClass username and password in `example/example.js`, then run the example:
```bash
npm run example
```

## Usage Instructions
Since this project hasn't been uploaded to npm yet, you can import it directly from a local path:

First, create a new Node.js project in another folder, then add the following dependency to your `package.json` (please change the path to your local absolute path):

Due to the addition of reCAPTCHA to the NTOU Tronclass login page on 2025/10/13, the OCR text recognition function has been updated.
You are required to add an OCR parameter to the login function and pass in a function capable of recognizing text from an image.
If you do not need OCR, you can refer to the login function in the previous version of index.ts.

```json
{
  "dependencies": {
    "tronclass-api": "file:/absolute/path/to/tronclass-api"
  } 
}
```

Then, use it in your code like this:

```javascript
import { Tronclass } from "tronclass-api";

(async () => {
  const tron = new Tronclass();
  tron.setBaseUrl("https://tronclass.com"); // Your school's TronClass URL
  await tron.login("your_username", "your_password");
  const courses = await tron.recentlyVisitedCourses();
  console.log(courses);
})();
```
> English vision translate by AI
