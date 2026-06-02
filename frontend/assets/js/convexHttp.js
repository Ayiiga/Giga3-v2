(function () {
  const base = window.GIGA3_CONFIG.CONVEX_URL.replace(/\/$/, "");

  async function call(endpoint, path, args) {
    const res = await fetch(`${base}/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args, format: "json" }),
    });
    const data = await res.json();
    if (data.status === "error") {
      throw new Error(data.errorMessage || "Convex request failed");
    }
    return data.value;
  }

  window.convexQuery = (path, args) => call("query", path, args);
  window.convexMutation = (path, args) => call("mutation", path, args);
  window.convexAction = (path, args) => call("action", path, args);
})();
