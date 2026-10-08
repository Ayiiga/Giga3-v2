import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const workflowsDir = join(root, ".github/workflows");

/** Status-check functions are only legal in `if:` (and job-level `if:`). */
const STATUS_CHECK_FN = /\b(success|always|cancelled|failure)\s*\(/g;

function workflowFiles(): string[] {
  return readdirSync(workflowsDir)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((name) => join(workflowsDir, name));
}

/**
 * Find `${{ ... cancelled() ... }}` (etc.) interpolations that are NOT on an
 * `if:` key. Those cause GitHub's workflow validator to reject the file with
 * "Unrecognized function: 'cancelled'" (same for success/always/failure).
 */
function statusChecksOutsideIf(source: string): Array<{ line: number; text: string }> {
  const violations: Array<{ line: number; text: string }> = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    // `if:` / `if :` keys may contain status-check functions.
    if (/^if\s*:/.test(trimmed)) continue;
    // Skip pure comments.
    if (trimmed.startsWith("#")) continue;

    // Only expressions inside ${{ }} are evaluated by the workflow engine.
    const exprRe = /\$\{\{\s*([\s\S]*?)\s*\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = exprRe.exec(line)) !== null) {
      const expr = match[1];
      STATUS_CHECK_FN.lastIndex = 0;
      if (STATUS_CHECK_FN.test(expr)) {
        violations.push({ line: i + 1, text: line.trim() });
      }
    }
  }
  return violations;
}

describe("GitHub Actions workflow expressions", () => {
  it("never uses status-check functions outside if: conditionals", () => {
    const files = workflowFiles();
    expect(files.length).toBeGreaterThan(0);

    const all: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const v of statusChecksOutsideIf(src)) {
        all.push(`${file.replace(root + "/", "")}:${v.line}: ${v.text}`);
      }
    }
    expect(all, all.join("\n") || "no violations").toEqual([]);
  });

  it("Rollouts finish steps use job.status for cancellation, not cancelled()", () => {
    for (const rel of [
      ".github/workflows/convex-deploy.yml",
      ".github/workflows/pages.yml",
    ]) {
      const src = readFileSync(join(root, rel), "utf8");
      expect(src, rel).not.toMatch(/\$\{\{\s*cancelled\s*\(\s*\)\s*\}\}/);
      expect(src, rel).toContain("JOB_STATUS: ${{ job.status }}");
      expect(src, rel).toMatch(/\[ "\$\{JOB_STATUS\}" = "cancelled" \]/);
      // Finish reporting must stay non-blocking and run after cancel/fail.
      const finishBlocks = src.split("- name: Report deploy finish to Cursor Rollouts");
      expect(finishBlocks.length).toBeGreaterThan(1);
      const finish = finishBlocks[1];
      expect(finish).toContain("if: always()");
      expect(finish).toContain("continue-on-error: true");
      expect(finish).toContain("secrets.CURSOR_API_KEY");
    }
  });

  it("report-rollouts-deployment.sh has valid bash syntax", () => {
    const script = join(root, "scripts/report-rollouts-deployment.sh");
    expect(() => execFileSync("bash", ["-n", script], { stdio: "pipe" })).not.toThrow();
  });
});
