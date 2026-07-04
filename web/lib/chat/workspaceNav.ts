/** Sidebar / hash links open the chat workspace panel without full-page navigation. */

export type WorkspaceNavTarget = "modes" | "documents" | "media" | "news" | "sports" | "history";

export const WORKSPACE_NAV_EVENT = "giga3:workspace-nav";

export function dispatchWorkspaceNav(target: WorkspaceNavTarget) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_NAV_EVENT, { detail: { target } })
  );
}

export function scrollToChatHistory() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("history");
  if (!el) return;
  el.scrollIntoView({ behavior: "auto", block: "start" });
}
