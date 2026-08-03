export {
  GIGAEDIT_FEATURE_DEFAULTS,
  getGigaEditFeatures,
  useGigaEditFeatures,
  type GigaEditFeatureFlags,
} from "@/lib/gigaedit/featureFlags";
export {
  GIGAEDIT_QUICK_ACTIONS,
  EXPORT_FORMATS,
  type GigaEditSection,
  type GigaEditProjectMeta,
  type GigaEditTimelineClip,
  type ExportAspectRatio,
} from "@/lib/gigaedit/types";
export {
  createEmptyProject,
  listGigaEditProjects,
  saveGigaEditProject,
  deleteGigaEditProject,
  duplicateGigaEditProject,
  getGigaEditProject,
  putProjectOriginalBlob,
  getProjectOriginalBlob,
  exportProjectJson,
  type GigaEditProjectRecord,
} from "@/lib/gigaedit/projects";
export {
  GIGAEDIT_OFFLINE_CAPABILITIES,
  isGigaEditOnline,
  enqueueGigaEditSync,
  flushGigaEditSyncQueue,
  listGigaEditSyncQueue,
} from "@/lib/gigaedit/offline";
export { GIGAEDIT_TEMPLATES } from "@/lib/gigaedit/templates";
export {
  buildAiAssistPrompt,
  generateLocalCreativeDraft,
  launchAiAssistInChat,
  type AiAssistKind,
} from "@/lib/gigaedit/aiAssist";
export { aspectRatioCss, aspectRatioSize } from "@/lib/gigaedit/exportFormats";
export {
  storePublishHandoff,
  peekPublishHandoff,
  consumePublishHandoffMeta,
  loadPublishHandoffFiles,
  launchGigaSocialWithHandoff,
} from "@/lib/gigaedit/publishHandoff";
export {
  destinationComposerSeed,
  privacyToSocialVisibility,
  type GigaEditPublishDestination,
  type GigaEditPublishPrivacy,
} from "@/lib/gigaedit/publishTypes";
export {
  listSounds,
  saveSound,
  getSound,
  getSoundBlob,
  incrementSoundUsage,
  soundAttributionLine,
  filterSounds,
  type GigaEditSoundAsset,
} from "@/lib/gigaedit/soundLibrary";
export {
  enqueuePublishQueue,
  listPublishQueue,
  flushPublishQueueToHandoff,
} from "@/lib/gigaedit/publishQueue";
export { extractAudioFromVideo } from "@/lib/gigaedit/audioExtract";
