import { Container } from "@/components/ui/Container";
import { MediaStudioClient } from "@/components/media/MediaStudioClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Media Studio",
  description: "Generate images and videos with Giga3 AI and Replicate",
};

export default function MediaPage() {
  return (
    <div className="section-padding pt-28">
      <Container>
        <MediaStudioClient />
      </Container>
    </div>
  );
}
