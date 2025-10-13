import Tronclass from "../dist/index.js";
import captcha from "captcha-nodejs-module";

const username = process.env.TRON_USER;
const password = process.env.TRON_PASS;
const baseUrl = process.env.TRON_BASE_URL;

if (!username)
  throw new Error("Please set the TRON_USER environment variable.");
if (!password)
  throw new Error("Please set the TRON_PASS environment variable.");
if (!baseUrl)
  throw new Error("Please set the TRON_BASE_URL environment variable.");

async function main() {
  const tronclass = new Tronclass();
  tronclass.setBaseUrl(baseUrl);
  await tronclass.login(username, password, captcha).then((loginResult) => {
    if (loginResult.success) {
      console.log("Login succeeded:", loginResult.message);
    } else {
      console.error("Login failed:", loginResult.message);
      return;
    }
  });

  await tronclass.recentlyVisitedCourses().then((data) => {
    console.log("Recently visited courses:", data);
  });
}

main();
