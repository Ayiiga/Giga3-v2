/**
 * Isolated GigaEdits UX prototype interactions.
 * Mock state only — no IndexedDB, export engine, or network.
 */
(function () {
  "use strict";

  const home = document.getElementById("screen-home");
  const quick = document.getElementById("screen-quick-edit");
  const statusEl = document.getElementById("status");
  const exportBtn = document.getElementById("btn-export");
  const undoBtn = document.getElementById("btn-undo");
  const redoBtn = document.getElementById("btn-redo");
  const previewEmpty = document.getElementById("preview-empty");
  const previewFilled = document.getElementById("preview-filled");
  const timelineClip = document.getElementById("timeline-clip");
  const timelineTime = document.getElementById("timeline-time");
  const toolPanel = document.getElementById("tool-panel");
  const panelTitle = document.getElementById("panel-title");
  const panelBody = document.getElementById("panel-body");
  const panelCaptions = document.getElementById("panel-captions");

  /** @type {{ hasMedia: boolean; activeTool: string | null; history: string[]; future: string[] }} */
  const state = {
    hasMedia: false,
    activeTool: null,
    history: [],
    future: [],
  };

  const TOOL_COPY = {
    import: {
      title: "Import",
      body: "In production this opens the device picker. Here we only attach mock media for layout.",
    },
    trim: {
      title: "Trim",
      body: "Keep before/after playhead would confirm here. This prototype does not change clip ranges.",
    },
    text: {
      title: "Text",
      body: "Overlay text tools stay secondary so beginners are not overwhelmed.",
    },
    audio: {
      title: "Audio",
      body: "On-device voiceover is free in production. No recording runs in this prototype.",
    },
    captions: {
      title: "Captions",
      body: "Draft captions locally. Production still burns only the first two lines on export — be honest in UI.",
    },
  };

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  function showHome() {
    if (home) home.hidden = false;
    if (quick) quick.hidden = true;
    setStatus("");
  }

  function showQuickEdit() {
    if (home) home.hidden = true;
    if (quick) quick.hidden = false;
    setStatus(state.hasMedia ? "Mock clip on timeline." : "Import a mock clip to continue.");
  }

  function pushHistory(label) {
    state.history.push(label);
    state.future = [];
    syncHistoryButtons();
  }

  function syncHistoryButtons() {
    if (undoBtn) undoBtn.disabled = state.history.length === 0;
    if (redoBtn) redoBtn.disabled = state.future.length === 0;
  }

  function syncMediaUi() {
    const on = state.hasMedia;
    if (previewEmpty) previewEmpty.hidden = on;
    if (previewFilled) previewFilled.hidden = !on;
    if (timelineClip) timelineClip.hidden = !on;
    if (timelineTime) timelineTime.textContent = on ? "0:16 / 0:42" : "0:00 / 0:00";
    if (exportBtn) exportBtn.disabled = !on;
    document.querySelectorAll(".ge-proto__tool").forEach((btn) => {
      const tool = btn.getAttribute("data-tool");
      if (tool === "import") return;
      btn.disabled = !on;
    });
  }

  function selectTool(tool) {
    state.activeTool = tool;
    document.querySelectorAll(".ge-proto__tool").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-tool") === tool ? "true" : "false");
    });
    const copy = TOOL_COPY[tool];
    if (!copy || !toolPanel) return;
    toolPanel.hidden = false;
    if (panelTitle) panelTitle.textContent = copy.title;
    if (panelBody) panelBody.textContent = copy.body;
    if (panelCaptions) {
      const showCap = tool === "captions";
      panelCaptions.hidden = !showCap;
    }
  }

  function importMock() {
    state.hasMedia = true;
    pushHistory("import-mock");
    syncMediaUi();
    selectTool("import");
    setStatus("Mock media attached. Export stays disabled from writing a real file.");
    // Export enabled for affordance, but click explains it is mock-only
    if (exportBtn) exportBtn.disabled = false;
  }

  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    const actionEl = t.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.getAttribute("data-action");
      if (action === "open-quick-edit") {
        showQuickEdit();
        return;
      }
      if (action === "go-home") {
        showHome();
        return;
      }
      if (action === "toast") {
        setStatus(actionEl.getAttribute("data-toast") || "");
        // If on home, surface toast in a temporary status under banner via alert-free path:
        const note = actionEl.getAttribute("data-toast") || "";
        if (home && !home.hidden) {
          let toast = document.getElementById("home-toast");
          if (!toast) {
            toast = document.createElement("p");
            toast.id = "home-toast";
            toast.className = "ge-proto__status";
            toast.setAttribute("role", "status");
            toast.setAttribute("aria-live", "polite");
            home.appendChild(toast);
          }
          toast.textContent = note;
        }
        return;
      }
    }

    const toolBtn = t.closest(".ge-proto__tool");
    if (toolBtn && toolBtn instanceof HTMLButtonElement && !toolBtn.disabled) {
      const tool = toolBtn.getAttribute("data-tool");
      if (tool === "import") {
        importMock();
        return;
      }
      if (tool) {
        selectTool(tool);
        setStatus(`${TOOL_COPY[tool]?.title || tool} selected (layout only).`);
      }
    }
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!state.hasMedia) {
        setStatus("Import mock media first.");
        return;
      }
      setStatus("Export is a visible action only — this prototype does not encode or download a file.");
    });
  }

  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      const last = state.history.pop();
      if (!last) return;
      state.future.push(last);
      if (last === "import-mock") {
        state.hasMedia = false;
        state.activeTool = null;
        if (toolPanel) toolPanel.hidden = true;
        document.querySelectorAll(".ge-proto__tool").forEach((btn) => {
          btn.setAttribute("aria-pressed", "false");
        });
        syncMediaUi();
      }
      syncHistoryButtons();
      setStatus(`Undo: ${last}`);
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener("click", () => {
      const next = state.future.pop();
      if (!next) return;
      state.history.push(next);
      if (next === "import-mock") {
        state.hasMedia = true;
        syncMediaUi();
      }
      syncHistoryButtons();
      setStatus(`Redo: ${next}`);
    });
  }

  // Workspace selection visuals on home
  document.querySelectorAll("[data-workspace]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-workspace]").forEach((b) => {
        b.classList.toggle("ge-proto__workspace--active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
    });
  });

  syncMediaUi();
  syncHistoryButtons();
  showHome();
})();
