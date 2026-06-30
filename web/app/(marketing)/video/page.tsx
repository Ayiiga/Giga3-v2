import dynamic from "next/dynamic";

const VideoStudioClient = dynamic(
  () =>
    import("@/components/video/VideoStudioClient").then((m) => m.VideoStudioClient),
  { ssr: false }
);

export default function VideoPage() {
  return (
    <div className="media-stable py-8 sm:py-12">
      <VideoStudioClient />
    </div>
  );
}
