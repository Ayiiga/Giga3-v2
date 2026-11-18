const PROJECT_TRACKS = {
  "ai-machine-learning": {
    id: "ai",
    outcome: "Choose AI tools for real tasks, write clear prompts with constraints and examples, refine weak answers, and verify claims before using them.",
    evidence: "Create a deliverable and include your prompt revisions, verification log, and final human-edited result.",
  },
  "website-pwa-development": {
    id: "web",
    outcome: "Build and publish your own responsive website, then make it installable with a manifest and usable offline with a service worker.",
    evidence: "Share the hosted site, source files, and results from mobile, installation, and offline tests.",
  },
  "mobile-app-development": {
    id: "mobile",
    outcome: "Build a working mobile app with usable screens, validated input, and data that persists when the app restarts.",
    evidence: "Share your source code, a recording of the running app, and your device or emulator test results.",
  },
  "robotics-intelligent-systems": {
    id: "robotics",
    outcome: "Build and test a simulated device that reads inputs, changes state, and handles faults safely.",
    evidence: "Share your simulation or pseudocode, block diagram, and results for normal operation and simulated faults.",
  },
} satisfies Record<string, { id: string; outcome: string; evidence: string }>;

export function getAcademyProjectTrack(slug: string) {
  if (!Object.hasOwn(PROJECT_TRACKS, slug)) return undefined;
  const track = PROJECT_TRACKS[slug as keyof typeof PROJECT_TRACKS];
  return { ...track, href: `/gigalearn/academy/workspace/?view=course/${track.id}` };
}
