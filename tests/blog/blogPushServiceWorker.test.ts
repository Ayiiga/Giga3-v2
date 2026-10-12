import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("blog OneSignal service worker coexistence", () => {
  it("ships OneSignal worker under /push/onesignal/ without touching root sw.js", () => {
    const osSw = readFileSync(
      resolve(__dirname, "../../web/public/push/onesignal/OneSignalSDKWorker.js"),
      "utf8"
    );
    const rootSw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");

    expect(osSw).toContain('importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js")');
    expect(osSw).not.toContain("CACHE_VERSION");
    expect(rootSw).toContain('CACHE_VERSION = "giga3-v29"');
    expect(rootSw).not.toContain("OneSignalSDK.sw.js");
    expect(rootSw).not.toContain("onesignal.com");
  });

  it("keeps ServiceWorkerRegister on /sw.js scope /", () => {
    const reg = readFileSync(
      resolve(__dirname, "../../web/components/pwa/ServiceWorkerRegister.tsx"),
      "utf8"
    );
    expect(reg).toContain('register("/sw.js"');
    expect(reg).toContain('scope: "/"');
    expect(reg).not.toContain("OneSignal");
  });
});
