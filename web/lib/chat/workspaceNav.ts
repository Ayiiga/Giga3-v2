/** Sidebar / hash links open the chat workspace panel without full-page navigation. */

export type WorkspaceNavTarget = "modes" | "documents" | "media" | "history";

export const WORKSPACE_NAV_EVENT = "giga3:workspace-nav";

export function dispatchWorkspaceNav(target: WorkspaceNavTarget) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_NAV_EVENT, { detail: { target } })
  );
}

export function scrollToChatHistory() {
  if (typeof document === "undefined") return;
  document.getElementById("history")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
