export type MediaJobStatus = "pending" | "processing" | "succeeded" | "failed";

export interface MediaJob {
  _id: string;
  mediaType: "image" | "video";
  status: MediaJobStatus;
  prompt: string;
  outputUrl?: string;
  errorMessage?: string;
}
