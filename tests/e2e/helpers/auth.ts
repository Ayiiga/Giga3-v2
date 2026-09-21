import type { Page } from "@playwright/test";

export function e2eCredentials(): { email: string; password: string } | null {
  const email = process.env.GIGA3_E2E_EMAIL?.trim();
  const password = process.env.GIGA3_E2E_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export async function signInViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/chat/login/");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/chat\/?$/, { timeout: 60_000 });
}

export async function installTtsProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __gigaTtsLog: string[] }).__gigaTtsLog = [];
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const origCancel = synth.cancel.bind(synth);
    const origSpeak = synth.speak.bind(synth);
    synth.cancel = function () {
      (window as unknown as { __gigaTtsLog: string[] }).__gigaTtsLog.push("cancel");
      return origCancel();
    };
    synth.speak = function (utterance: SpeechSynthesisUtterance) {
      (window as unknown as { __gigaTtsLog: string[] }).__gigaTtsLog.push(
        `speak:${utterance.text.slice(0, 80)}`
      );
      return origSpeak(utterance);
    };
  });
}

export async function readTtsLog(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __gigaTtsLog?: string[] }).__gigaTtsLog ?? []);
}

export async function clearTtsLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __gigaTtsLog: string[] }).__gigaTtsLog = [];
  });
}
