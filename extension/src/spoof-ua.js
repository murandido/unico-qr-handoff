/*
 * Unico QR Handoff
 *
 * Unico's web flow (cadastro.unico.app) treats Opera as an unsupported browser.
 * On desktop, an unsupported browser is sent to the QR code screen so the
 * selfie can be taken on a phone. This script runs inside Unico's frames only,
 * before any page script, and appends an Opera token ("OPR/x") to the
 * user agent the page sees. Every other site keeps the real user agent.
 */
(() => {
  "use strict";

  const OPERA_TOKEN = "OPR/125.0.0.0";
  const proto = Navigator.prototype;

  const readNative = (prop) => {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    return desc && typeof desc.get === "function" ? desc.get.call(navigator) : undefined;
  };

  const realUserAgent = readNative("userAgent");
  if (typeof realUserAgent !== "string" || /\bOPR\//.test(realUserAgent)) return;

  const override = (prop, value) => {
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable: true,
      get() {
        return value;
      },
    });
  };

  override("userAgent", `${realUserAgent} ${OPERA_TOKEN}`);

  const realAppVersion = readNative("appVersion");
  if (typeof realAppVersion === "string") {
    override("appVersion", `${realAppVersion} ${OPERA_TOKEN}`);
  }
})();
