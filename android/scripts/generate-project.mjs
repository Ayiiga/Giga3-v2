#!/usr/bin/env node
/**
 * Non-interactive Bubblewrap project generator for Giga3 TWA.
 * Reads the committed web manifest; does not create signing keys.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BufferedLog,
  ConsoleLog,
  TwaGenerator,
  TwaManifest,
} from "@bubblewrap/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const androidRoot = resolve(__dirname, "..");
const repoRoot = resolve(androidRoot, "..");
const webManifestPath = join(repoRoot, "web/public/manifest.json");
const icon512Url = "https://www.giga3ai.com/icons/icon-512.png";
const iconMaskableUrl = "https://www.giga3ai.com/icons/icon-maskable-512.png";

const webManifest = JSON.parse(readFileSync(webManifestPath, "utf8"));
const webManifestUrl = new URL("https://www.giga3ai.com/manifest.json");

const twa = TwaManifest.fromWebManifestJson(webManifestUrl, webManifest);

Object.assign(twa, {
  packageId: "com.giga3ai.app",
  host: "www.giga3ai.com",
  name: "Giga3 AI",
  launcherName: "Giga3",
  startUrl: "/",
  fullScopeUrl: "https://www.giga3ai.com/",
  webManifestUrl: "https://www.giga3ai.com/manifest.json",
  iconUrl: icon512Url,
  maskableIconUrl: iconMaskableUrl,
  enableNotifications: true,
  signingKey: { path: "./android.keystore", alias: "android" },
  appVersion: "1.0.0",
  appVersionCode: 1,
  minSdkVersion: 21,
  fingerprints: [],
  features: {
    locationDelegation: { enabled: true },
    playBilling: { enabled: false },
  },
  generatorApp: "bubblewrap-cli (giga3 generate-project.mjs)",
});

const manifestPath = join(androidRoot, "twa-manifest.json");
await twa.saveToFile(manifestPath);

const log = new BufferedLog(new ConsoleLog("giga3-twa-generate"));
const generator = new TwaGenerator();
await generator.createTwaProject(androidRoot, twa, log, () => {});
log.flush();

const checksum = await import("node:crypto").then((crypto) =>
  crypto.createHash("sha1").update(readFileSync(manifestPath)).digest("hex")
);
writeFileSync(join(androidRoot, "manifest-checksum.txt"), checksum);

console.log("Generated TWA project at", androidRoot);
console.log("Package ID:", twa.packageId);
console.log("Host:", twa.host);
