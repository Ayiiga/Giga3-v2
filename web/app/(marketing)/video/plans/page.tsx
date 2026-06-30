import dynamic from "next/dynamic";

const VideoPlansClient = dynamic(
  () =>
    import("@/components/video/VideoPlansClient").then((m) => m.VideoPlansClient),
  { ssr: false }
);

export default function VideoPlansPage() {
  return (
    <div className="media-stable py-8 sm:py-12">
      <VideoPlansClient />
    </div>
  );
}
