import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(__filename);
const { PDFDocument } = require("../../web/node_modules/pdf-lib") as typeof import("pdf-lib");
const JSZip = require("../../web/node_modules/jszip") as typeof import("jszip");

test.describe("Document Studio — Android mobile browser workflow", () => {
  test("edit, add passport picture, export real files, save and reopen CV", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile-chrome", "Run on the Pixel mobile Chrome project");

    await page.goto("/documents/", { waitUntil: "domcontentloaded" });
    for (const town of ["Binduri", "Walewale", "Nalerigu", "Agona"]) {
      await expect(page.getByText(new RegExp(`· ${town}$`))).toBeVisible();
    }
    await expect(page.getByText("Mpoko Charles", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Godwin Atia", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Modern", exact: true }).click();
    await expect(page.getByRole("button", { name: /Executive Shaded/ })).toHaveCount(0);
    await page.getByRole("button", { name: /Signature Bold name header/ }).click();
    await page.getByRole("button", { name: "Teal", exact: true }).click();
    const editor = page.locator(".document-studio .ProseMirror");
    const title = page.getByLabel("Document title");
    await expect(editor).toBeVisible();
    await expect(editor.locator("h1")).toHaveText("Full Name");
    await title.fill("Android Document QA CV");
    await editor.click();
    await editor.press("ControlOrMeta+End");
    await editor.press("Enter");
    await editor.type("Verified additional classroom experience.");
    await expect(editor).toContainText("Verified additional classroom experience.");

    // Create a test picture locally in the browser; no real personal photo is used.
    const photo = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 80;
      canvas.height = 100;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#8db4d6";
      ctx.fillRect(0, 0, 80, 100);
      ctx.fillStyle = "#f0d8b8";
      ctx.fillRect(20, 20, 40, 60);
      return canvas.toDataURL("image/png");
    });
    await page.locator('input[aria-label="Upload optional passport-style CV photo"]').setInputFiles({
      name: "qa-portrait.png",
      mimeType: "image/png",
      buffer: Buffer.from(photo.split(",")[1], "base64"),
    });
    await expect(page.getByAltText("CV portrait preview")).toBeVisible();
    await page.getByRole("button", { name: "Preview CV", exact: true }).click();
    await expect(editor).toHaveAttribute("contenteditable", "false");
    await expect(editor.locator("h1")).toHaveCSS("background-color", "rgb(0, 103, 95)");
    await expect(page.getByAltText("Passport-style CV portrait")).toBeVisible();
    await page.getByRole("button", { name: "Sign document", exact: true }).click();
    const pad = page.getByLabel("Handwritten signature pad");
    await pad.scrollIntoViewIfNeeded();
    const bounds = (await pad.boundingBox())!;
    await page.mouse.move(bounds.x + 18, bounds.y + 24);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 72, bounds.y + 42, { steps: 4 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Apply signature", exact: true }).click();
    await expect(page.getByAltText("Your handwritten signature")).toBeVisible();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved on this device.")).toBeVisible();

    const pdfEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PDF" }).click();
    const pdfDownload = await pdfEvent;
    expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
    const pdfBytes = await readFile((await pdfDownload.path())!);
    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(pdfBytes.length).toBeGreaterThan(2000);
    await expect(page.getByText(/PDF ready/)).toBeVisible();

    const wordEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export Word" }).click();
    const wordDownload = await wordEvent;
    expect(wordDownload.suggestedFilename()).toMatch(/\.docx$/);
    const wordBytes = await readFile((await wordDownload.path())!);
    const word = await JSZip.loadAsync(wordBytes);
    expect(word.file("word/document.xml")).not.toBeNull();
    const wordXml = await word.file("word/document.xml")!.async("string");
    expect(wordXml).toContain("Verified additional classroom experience.");
    expect(wordXml).toContain('w:fill="00675F"');
    expect(wordXml).toContain("Handwritten signature");
    expect(Object.keys(word.files).some((p) => p.startsWith("word/media/"))).toBe(true);

    const slidesEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export Slides" }).click();
    const slidesDownload = await slidesEvent;
    expect(slidesDownload.suggestedFilename()).toMatch(/\.pptx$/);
    const slideBytes = await readFile((await slidesDownload.path())!);
    const slides = await JSZip.loadAsync(slideBytes);
    expect(slides.file("ppt/presentation.xml")).not.toBeNull();
    expect(slides.file("ppt/slides/slide1.xml")).not.toBeNull();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "View CV Android Document QA CV", exact: true }).click();
    await expect(page.locator(".document-studio .ProseMirror")).toHaveAttribute("contenteditable", "false");
    await expect(page.getByLabel("Document title")).toHaveValue("Android Document QA CV");
    await expect(page.locator(".document-studio .ProseMirror")).toContainText(
      "Verified additional classroom experience."
    );
    await expect(page.getByAltText("CV portrait preview")).toBeVisible();

    await expect(page.getByAltText("Your handwritten signature")).toBeVisible();
    await page.getByRole("button", { name: "Edit Android Document QA CV", exact: true }).click();
    await expect(page.getByRole("heading", { name: "CV Profile" })).toBeVisible();
    await page.getByRole("button", { name: "Education", exact: true }).click();
    await page.getByRole("button", { name: "Example", exact: true }).click();
    await expect(page.getByText("Example College of Education")).toBeVisible();
    await page.getByRole("button", { name: "Education", exact: true }).click();
    await page.getByRole("button", { name: "Add entry", exact: true }).click();
    await page.getByLabel("Course / Degree").last().fill("Diploma in Education");
    await page.getByLabel("School / University").last().fill("Example College");
    await page.getByRole("button", { name: "Move Education 2 up" }).click();
    await page.getByRole("button", { name: "Save section", exact: true }).click();
    await page.getByRole("button", { name: "View CV", exact: true }).click();
    await expect(page.locator(".document-studio .ProseMirror")).toContainText("Diploma in Education");
    await expect(page.locator(".document-studio .ProseMirror")).toContainText("Verified additional classroom experience.");
  });

  test("previews and saves a non-CV document design on mobile", async ({ page }) => {
    await page.goto("/documents/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Proposal Client or project proposal" }).click();
    const studio = page.locator(".document-studio");
    const design = studio.getByLabel("Document design");
    const editor = studio.locator(".ProseMirror");
    await expect(design).toHaveValue("business");
    await expect(editor.locator("h1")).toHaveCSS("background-color", "rgb(22, 62, 106)");
    await expect(editor.locator("h1")).toHaveCSS("color", "rgb(255, 255, 255)");

    await design.selectOption("editorial");
    await studio.getByRole("button", { name: "Burgundy", exact: true }).click();
    await expect(editor.locator("h2").first()).toHaveCSS("color", "rgb(139, 37, 75)");
    await expect(editor.locator("h2").first()).toHaveCSS("border-bottom-style", "solid");
    await studio.getByRole("button", { name: "Save draft" }).click();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Edit Proposal", exact: true }).click();
    await expect(design).toHaveValue("editorial");
    await expect(studio.getByRole("button", { name: "Burgundy", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(editor.locator("h2").first()).toHaveText("Overview");
  });

  test("narrow Android viewport keeps controls reachable with keyboard-sized screen", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile-chrome", "Run on the Pixel mobile Chrome project");
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/documents/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Professional CV \(A4\)/ }).first().click();
    await expect(page.locator(".document-studio .ProseMirror")).toBeVisible();

    const frame = page.locator(".document-studio .overflow-x-auto").first();
    const fits = await frame.evaluate((el) => el.scrollWidth <= el.clientWidth + 2);
    expect(fits).toBe(true);

    await page.locator(".document-studio .ProseMirror").click();
    await page.setViewportSize({ width: 360, height: 420 });
    const exportPdf = page.getByRole("button", { name: "Export PDF" });
    await exportPdf.scrollIntoViewIfNeeded();
    await expect(exportPdf).toBeVisible();
    const rect = await exportPdf.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.y).toBeGreaterThanOrEqual(-2);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(422);
  });
});
