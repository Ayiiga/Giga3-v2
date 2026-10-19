/**
 * React mirror of the isolated GigaEdits UX prototype screens.
 * Not imported by web/app — production static export must not include a route for this.
 */
"use client";

import { useState } from "react";

export type GigaEditsUxScreen = "home" | "quick-edit";

export type GigaEditsUxPrototypeProps = {
  initialScreen?: GigaEditsUxScreen;
};

const WORKSPACES = [
  {
    id: "quick",
    title: "Quick Edit",
    blurb: "Import, trim, text, captions — one clear path to export.",
    opensQuickEdit: true,
  },
  {
    id: "film",
    title: "Film Studio",
    blurb: "Multi-track timeline and joins when you need more control.",
    opensQuickEdit: false,
  },
  {
    id: "creator",
    title: "Creator Studio",
    blurb: "Teleprompter, brand kit, and publishing helpers together.",
    opensQuickEdit: false,
  },
] as const;

const TOOLS = ["Import", "Trim", "Text", "Audio", "Captions"] as const;

/**
 * Lightweight React shell used by unit tests. Visual CSS lives in proto.css / index.html.
 */
export function GigaEditsUxPrototype({ initialScreen = "home" }: GigaEditsUxPrototypeProps) {
  const [screen, setScreen] = useState<GigaEditsUxScreen>(initialScreen);
  const [workspace, setWorkspace] = useState<(typeof WORKSPACES)[number]["id"]>("quick");
  const [hasMedia, setHasMedia] = useState(false);
  const [activeTool, setActiveTool] = useState<(typeof TOOLS)[number] | null>(null);
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  function openQuickEdit() {
    setScreen("quick-edit");
    setStatus(hasMedia ? "Mock clip on timeline." : "Import a mock clip to continue.");
  }

  function goHome() {
    setScreen("home");
    setStatus("");
  }

  function importMock() {
    setHasMedia(true);
    setHistory((h) => [...h, "import-mock"]);
    setFuture([]);
    setActiveTool("Import");
    setStatus("Mock media attached. Export does not write a real file.");
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const next = [...h];
      const last = next.pop()!;
      setFuture((f) => [...f, last]);
      if (last === "import-mock") {
        setHasMedia(false);
        setActiveTool(null);
      }
      setStatus(`Undo: ${last}`);
      return next;
    });
  }

  function redo() {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = [...f];
      const item = next.pop()!;
      setHistory((h) => [...h, item]);
      if (item === "import-mock") setHasMedia(true);
      setStatus(`Redo: ${item}`);
      return next;
    });
  }

  return (
    <div data-prototype="gigaedits-ux" data-production-route="false" data-screen={screen}>
      <p role="note">
        <strong>Prototype only</strong> — not wired to production /gigaedit.
      </p>

      {screen === "home" ? (
        <section aria-label="Create Home">
          <p>GigaEdits</p>
          <h1>Create on your device</h1>
          <p>
            Trim, caption, and export locally. Drafts stay on this phone — not synced to your
            account yet.
          </p>
          <button type="button" onClick={openQuickEdit}>
            Create a video
          </button>
          <div role="group" aria-label="More create options">
            <button type="button" onClick={() => setStatus("Photo — production only")}>
              Photo
            </button>
            <button type="button" onClick={() => setStatus("Record — production only")}>
              Record
            </button>
            <button type="button" onClick={() => setStatus("Teleprompter — production only")}>
              Teleprompter
            </button>
          </div>
          <h2 id="workspaces-heading">Workspaces</h2>
          <div role="listbox" aria-labelledby="workspaces-heading">
            {WORKSPACES.map((w) => (
              <button
                key={w.id}
                type="button"
                role="option"
                aria-selected={workspace === w.id}
                onClick={() => {
                  setWorkspace(w.id);
                  if (w.opensQuickEdit) openQuickEdit();
                  else setStatus(`${w.title} is a future workspace — not built in this prototype.`);
                }}
              >
                <strong>{w.title}</strong>
                <span>{w.blurb}</span>
              </button>
            ))}
          </div>
          <p>
            <strong>Local device only.</strong> Recent projects are mock rows — this prototype does
            not read IndexedDB.
          </p>
          <h2>Recent projects</h2>
          <ul>
            <li>
              <span>Market walk — Accra</span>
              <button type="button" onClick={openQuickEdit}>
                Open
              </button>
            </li>
          </ul>
        </section>
      ) : (
        <section aria-label="Quick Edit">
          <button type="button" aria-label="Back to Create Home" onClick={goHome}>
            Back
          </button>
          <h1>Quick Edit</h1>
          <button
            type="button"
            disabled={!hasMedia}
            onClick={() =>
              setStatus(
                "Export is a visible action only — this prototype does not encode or download a file."
              )
            }
          >
            Export
          </button>
          <div aria-label="Media preview">{hasMedia ? "Mock clip ready" : "No clip yet"}</div>
          <div role="toolbar" aria-label="Quick Edit tools">
            {TOOLS.map((tool) => (
              <button
                key={tool}
                type="button"
                aria-pressed={activeTool === tool}
                disabled={tool !== "Import" && !hasMedia}
                onClick={() => {
                  if (tool === "Import") importMock();
                  else {
                    setActiveTool(tool);
                    setStatus(`${tool} selected (layout only).`);
                  }
                }}
              >
                {tool}
              </button>
            ))}
          </div>
          <div role="slider" aria-label="Playhead on mock timeline" aria-valuenow={hasMedia ? 16 : 0}>
            Timeline
          </div>
          <button type="button" disabled={history.length === 0} onClick={undo}>
            Undo
          </button>
          <button type="button" disabled={future.length === 0} onClick={redo}>
            Redo
          </button>
          <p role="status" aria-live="polite">
            {status}
          </p>
        </section>
      )}
    </div>
  );
}
