import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { UAParser } from "ua-parser-js";

const script = readFileSync(new URL("../extension/src/spoof-ua.js", import.meta.url), "utf8");

const REAL_UAS = {
  "chrome-linux":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
  "chrome-windows":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
  "chrome-macos":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
  "firefox-linux": "Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0",
  "firefox-windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
};

// Runs the content script against a fake Navigator that mimics the browser's
// prototype getters, and returns what page scripts would read afterwards.
function runInFakeBrowser(userAgent, appVersion = "5.0 (X11)") {
  class Navigator {}
  Object.defineProperty(Navigator.prototype, "userAgent", { configurable: true, get: () => userAgent });
  Object.defineProperty(Navigator.prototype, "appVersion", { configurable: true, get: () => appVersion });
  const navigator = new Navigator();
  vm.runInNewContext(script, { Navigator, navigator });
  return { userAgent: navigator.userAgent, appVersion: navigator.appVersion };
}

// Same rule Unico ships in its bundle: Opera is always "not supported".
const unicoSupportsBrowser = (ua) => !["OPR", "Opera"].includes(new UAParser(ua).getBrowser().name);

for (const [label, ua] of Object.entries(REAL_UAS)) {
  test(`${label}: the real user agent is supported, so Unico opens the local camera`, () => {
    assert.equal(unicoSupportsBrowser(ua), true);
  });

  test(`${label}: after the script, Unico sees an unsupported browser and shows the QR code`, () => {
    const { userAgent, appVersion } = runInFakeBrowser(ua);
    assert.ok(userAgent.startsWith(ua), "keeps the real user agent as prefix");
    assert.match(userAgent, / OPR\/\d+/);
    assert.match(appVersion, / OPR\/\d+/);
    assert.equal(unicoSupportsBrowser(userAgent), false);
  });
}

test("does not touch a user agent that already has an Opera token", () => {
  const opera = `${REAL_UAS["chrome-linux"]} OPR/120.0.0.0`;
  assert.equal(runInFakeBrowser(opera).userAgent, opera);
});
