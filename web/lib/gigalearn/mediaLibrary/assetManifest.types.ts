/**
 * Asset manifest for high-quality GigaLearn visuals.
 * Separate from catalog items — catalog references filenames once assets exist on disk.
 */

export type GigaLearnVisualStyle = "photographic" | "storybook_illustration";

export type GigaLearnAssetManifestEntry = {
  /** Stable id used in catalog remoteMedia paths. */
  id: string;
  /** File under web/public/… once generated. */
  filename: string;
  /** Absolute public URL path (leading slash). */
  publicPath: string;
  learningObjective: string;
  ageGroup: string;
  country: string;
  language: string;
  aspectRatio: "1:1" | "4:3" | "16:9";
  style: GigaLearnVisualStyle;
  altText: string;
  /** Linked Discover media item ids that should use this asset. */
  catalogItemIds: string[];
  offlineRequired: boolean;
  /** Generation prompt used (or planned) for this asset. */
  generationPrompt: string;
  negativePrompt: string;
  /** Provenance after a successful generation. */
  licensing: {
    rights: "original-ai-generated";
    provider: string;
    model?: string;
    generatedAt?: string;
    reviewed: boolean;
    notes: string;
  };
  /** Status of the binary on disk. */
  status: "planned" | "generated" | "failed";
  byteLength?: number;
  contentHash?: string;
  errorMessage?: string;
};

export type GigaLearnAssetManifest = {
  collectionId: string;
  title: string;
  country: string;
  level: string;
  styleGuide: string;
  createdAt: string;
  assets: GigaLearnAssetManifestEntry[];
};
