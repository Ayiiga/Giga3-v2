(function () {
  const base = window.GIGA3_CONFIG.CONVEX_URL.replace(/\/$/, "");
  const DEFAULT_TIMEOUT_MS = 90000;
  const MAX_RETRIES = 1;

  function isRetryable(err) {
    const msg = String(err?.message || err || "");
    return (
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("network") ||
      msg.includes("aborted") ||
      msg.includes("timeout") ||
      msg.includes("Load failed")
    );
  }

  async function callOnce(endpoint, path, args, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, args, format: "json" }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.status === "error") {
        throw new Error(data.errorMessage || "Convex request failed");
      }
      return data.value;
    } catch (err) {
      if (controller.signal.aborted) {
        throw new Error(
          "Request timed out. On slower mobile networks, wait a moment and try again."
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function call(endpoint, path, args, timeoutMs) {
    const ms = timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let lastErr;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await callOnce(endpoint, path, args, ms);
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES && isRetryable(err)) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  window.convexQuery = (path, args, opts) => call("query", path, args, opts?.timeoutMs);
  window.convexMutation = (path, args, opts) => call("mutation", path, args, opts?.timeoutMs);
  window.convexAction = (path, args, opts) => call("action", path, args, opts?.timeoutMs);
})();
