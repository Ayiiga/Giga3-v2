import { Container } from "@/components/ui/Container";
import { VisionTagline } from "@/components/vision/VisionTagline";
import { GIGA3_VISION } from "@/lib/vision";
import { siteConfig } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: GIGA3_VISION.mission,
};

export default function AboutPage() {
  return (
    <div className="marketing-stable bg-white">
      <Container className="section-padding">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <BrandLogo size={48} />
            <div>
              <h1 className="page-title">About {siteConfig.name}</h1>
              <VisionTagline className="mt-2" />
            </div>
          </div>

          <p className="section-lead mt-8">{GIGA3_VISION.mission}</p>

          <div className="mt-10 space-y-6 text-base leading-relaxed text-muted">
            <p>
              {siteConfig.name} is an advanced artificial intelligence platform from Ghana for learning,
              research, coding, creativity, productivity, content creation, and problem-solving.
            </p>
            <p>
              Designed and founded by{" "}
              <strong className="text-foreground">
                {siteConfig.founder.name} ({siteConfig.founder.alias})
              </strong>
              , {siteConfig.founder.role} from {siteConfig.founder.location} — {siteConfig.founder.organization}.
            </p>
            <p>
              From chat and media studios to GigaLearn, GigaSocial, Marketplace, and Enterprise
              workspaces, Giga3 delivers one unified ecosystem for individuals, creators, educators,
              and organizations across Africa and beyond.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { title: "Built in Africa", desc: "Rooted in Ghana, designed for global scale" },
              { title: "Powered by AI", desc: "Multi-provider failover and intelligent assistance" },
              { title: "Designed for Everyone", desc: "Students, creators, businesses, and enterprises" },
            ].map((item) => (
              <div key={item.title} className="saas-card rounded-2xl p-5 text-center">
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
