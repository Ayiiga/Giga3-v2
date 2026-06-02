const isLocalHost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

window.GIGA3_CONFIG = isLocalHost
  ? {
      CONVEX_URL: "http://127.0.0.1:3210",
      CONVEX_SITE_URL: "http://127.0.0.1:3211",
    }
  : {
      CONVEX_URL: "https://perfect-lark-521.convex.cloud",
      CONVEX_SITE_URL: "https://perfect-lark-521.convex.site",
    };
