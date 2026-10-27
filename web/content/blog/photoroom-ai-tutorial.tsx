import {
  ArticleCallout,
  ArticleFigure,
  ArticleH2,
  ArticleH3,
  ArticleLink,
  BulletList,
  FaqSection,
  Prose,
  RelatedReading,
} from "@/components/seo/SeoArticleParts";
import { BlogArticleLayout } from "@/components/blog/BlogHeader";
import { BlogProductCta } from "@/components/blog/BlogTableOfContents";
import type { BlogArticleBodyProps } from "@/lib/blog/posts";
import type { FaqItem } from "@/components/seo/JsonLd";

const TOC = [
  { id: "who-for", label: "Who this is for" },
  { id: "setup", label: "Set up Photoroom" },
  { id: "backgrounds", label: "Remove and replace backgrounds" },
  { id: "accuracy", label: "Keep products accurate" },
  { id: "consistency", label: "Consistent listings" },
  { id: "export", label: "Export for social and shops" },
  { id: "ghana-example", label: "Ghana shop example" },
  { id: "mistakes", label: "Common mistakes" },
  { id: "plans", label: "Plans and limits" },
  { id: "faq", label: "FAQ" },
] as const;

const FAQ: FaqItem[] = [
  {
    question: "Is Photoroom free for selling online?",
    answer:
      "Photoroom’s Help Center states that the Free plan is for personal, non-commercial use only, with limited features and lower export limits. Selling products online is commercial use — check https://www.photoroom.com/pricing and the Help Center plan article before you rely on Free for a shop.",
  },
  {
    question: "Does Background Remover use AI credits?",
    answer:
      "Photoroom’s Background Remover help article says the tool does not require AI credits, though exporting still counts toward your plan’s export allowance. Credit-based tools (such as some AI background studio or video features) are separate — confirm on the live pricing page.",
  },
  {
    question: "Can I use Photoroom on my phone in Ghana?",
    answer:
      "Yes. Photoroom offers mobile apps and web access. On mobile data, shoot in good light first, then edit on Wi‑Fi when you can. Keep original camera photos so you can re-edit if an export looks soft.",
  },
  {
    question: "Will AI backgrounds change my product colour?",
    answer:
      "They can. Always compare the edited image to the real item under daylight. If colour shifts, reduce stylisation, use a simpler background, or re-shoot. Marketplace trust depends on accurate colour and size representation.",
  },
];

export const PLAIN_TEXT = `
Photoroom AI tutorial professional product photos phone Ghana sellers fashion accessories
background removal AI backgrounds consistent listings exports Instagram WhatsApp
Free personal non-commercial Pro Max Ultra verify photoroom.com pricing common mistakes.
`.trim();

const AUTHOR_NOTE =
  "Ayiiga Benard Issaka is the founder of Giga3 AI, a Ghana-focused technology platform exploring practical uses of artificial intelligence, digital learning, and accessible technology. His work focuses on helping students, educators, creators, and entrepreneurs use technology more effectively. Questions about this guide: ayiiga3@gmail.com.";

function ArticleContent() {
  return (
    <>
      <Prose>
        Your phone already takes sharp enough photos for WhatsApp Broad Status and Instagram —
        until the bedroom wall, tangled charger, or busy market stall steals attention from the
        product. That is the problem Photoroom is built to solve: clean cutouts and shop-ready
        backgrounds without hiring a studio for every SKU.
      </Prose>
      <Prose>
        This tutorial is for small businesses, online sellers, fashion entrepreneurs, and social
        creators. Steps follow Photoroom’s official help guidance for Background Remover and plan
        limits. Always re-check{" "}
        <ArticleLink href="https://www.photoroom.com/">photoroom.com</ArticleLink> because features
        and quotas change.
      </Prose>

      <ArticleH2 id="who-for">Who this tutorial is for</ArticleH2>
      <BulletList
        items={[
          "Clothing and thrift sellers photographing garments on a hangar or mannequin",
          "Phone-accessory and gadget shops listing cases, earbuds, and chargers",
          "Beauty and handmade-product sellers who need consistent catalogue images",
          "Creators preparing product-style frames for ads and Reels covers",
        ]}
      />

      <ArticleH2 id="setup">Set up Photoroom on phone or web</ArticleH2>
      <BulletList
        items={[
          "Install Photoroom from the official App Store / Google Play listing, or open the web app from photoroom.com.",
          "Create an account with an email you control — avoid shared café logins for business catalogues.",
          "Grant photo permissions only if you are ready to select images from your library.",
          "Start with one well-lit product photo before batch-editing an entire inventory.",
        ]}
      />
      <Prose>
        Before you open the app, fix the shot. Stand near a window or outdoors in open shade — harsh
        midday sun creates shiny hotspots on phones and plastic packaging. Turn off beauty filters in
        your camera app; Photoroom cannot restore texture that a filter already smoothed away. Wipe
        fingerprints from glass products and straighten labels so the cutout looks intentional rather
        than crooked on a perfect white background.
      </Prose>

      <ArticleFigure
        src="/images/blog/photoroom-ai-tutorial.jpg"
        alt="Ghanaian seller photographing clothing with a phone beside products on a stall counter"
        caption="Good light and a clear product angle matter more than any AI background."
      />

      <ArticleH2 id="backgrounds">Background removal and new backgrounds</ArticleH2>
      <ArticleH3>Remove the background</ArticleH3>
      <Prose>
        Photoroom’s Help Center describes Background Remover like this: open the tool, upload (or
        capture) an image, let Photoroom remove the background, then continue with a template or
        editor tools before you download. On mobile you may also choose an existing image in-app.
      </Prose>
      <ArticleH3>Choose a suitable background</ArticleH3>
      <BulletList
        items={[
          "Neutral white or soft grey for marketplaces that prefer clean catalogues",
          "Subtle lifestyle scenes only when they match how customers will use the product",
          "Brand-coloured backdrops for Instagram grids — keep the same palette across a collection",
          "Avoid busy patterns that fight patterned fabrics or reflective phone cases",
        ]}
      />
      <ArticleCallout>
        Many Photoroom workflows remove the background automatically as part of a template. If the
        cutout looks wrong, zoom in on edges (hair, straps, transparent plastic) before you export.
      </ArticleCallout>

      <ArticleH2 id="accuracy">Keep products visually accurate</ArticleH2>
      <Prose>
        AI can invent prettier lighting than your shop has. Customers in Ghana who pay via MoMo
        and wait for delivery will judge you on honesty, not gloss. Check:
      </Prose>
      <BulletList
        items={[
          "Colour: compare the edit to the item under daylight near a window",
          "Proportion: do not stretch shoes, bottles, or phone sizes to fill the frame",
          "Defects: do not retouch away scratches you would still ship",
          "Labels and text: AI often garbles small print — crop rather than “fix” unreadable text",
        ]}
      />

      <ArticleH2 id="consistency">Create consistent product listings</ArticleH2>
      <Prose>
        Pick one framing rule and stick to it for a week of listings: for example, product centred,
        10% margin, soft shadow, white background. Consistency helps returning buyers recognise your
        brand in a crowded WhatsApp status or Instagram shop.
      </Prose>
      <Prose>
        Save a template or reuse the same background preset for a collection (all Ankara shirts, all
        clear MagSafe cases). Batch similar items together so your eye catches outliers.
      </Prose>

      <ArticleH2 id="export">Export for social platforms and shops</ArticleH2>
      <BulletList
        items={[
          "Export at the resolution your channel needs — square for many Instagram feed posts, vertical for Stories/Reels covers.",
          "Remember Photoroom counts exports toward plan limits (Help Center: each saved image counts).",
          "Keep a folder of originals + finals on Google Drive or your phone so you can re-export without reshooting.",
          "Compress carefully for WhatsApp; send the higher-quality file when a serious buyer asks.",
        ]}
      />

      <ArticleH2 id="ghana-example">Example: Makola clothing seller or phone-accessories shop</ArticleH2>
      <Prose>
        Imagine Ama sells thrift shirts near Makola and also posts on Instagram. She photographs each
        shirt on a plain hanger against a cloth backdrop at home, then opens Photoroom, removes the
        backdrop, applies the same soft white background, and exports a square image. On captions she
        still writes size, fabric notes, and location for pickup — AI did not invent those facts.
      </Prose>
      <Prose>
        Midweek, Ama batches ten shirts in one editing session on Wi‑Fi after market hours. She names
        files by date and SKU code so that when a buyer asks for “the blue oxford, size L,” she can
        find the original photo in seconds. When a shirt has a small stain she plans to disclose, she
        leaves it visible in the edit — trust beats a perfect cutout that hides defects.
      </Prose>
      <Prose>
        Or Kwame runs a phone-accessories table. He shoots cases on a clean tabletop, removes
        cluttered backgrounds, and keeps a grey backdrop for all listings so customers can compare
        colours fairly. When a case is translucent, he double-checks the cutout edge before posting
        to WhatsApp Status. For MagSafe rings and clear cases, he photographs against a darker cloth
        first so the outline is easier for Background Remover to separate, then switches to the shop’s
        standard grey background in the editor.
      </Prose>
      <Prose>
        Both sellers treat Photoroom as finishing, not as a substitute for stocking accurate inventory.
        If an item sells out, they archive the listing image instead of leaving a beautiful photo that
        invites disappointed buyers.
      </Prose>

      <ArticleFigure
        src="/images/blog/support-small-business-phone.jpg"
        alt="Ghanaian shop owner using a smartphone beside products on a counter"
        caption="Phone-first selling works when photos stay honest and consistent."
      />

      <ArticleH2 id="mistakes">Common mistakes to avoid</ArticleH2>
      <BulletList
        items={[
          "Shooting in yellow night-bulb light, then blaming the AI for “wrong colour”",
          "Using glamorous lifestyle backgrounds that hide the true size of the item",
          "Exporting once at low quality and deleting the original",
          "Assuming the Free plan covers commercial selling without reading Photoroom’s plan rules",
          "Editing customer face photos for ads without clear permission",
        ]}
      />

      <ArticleH2 id="plans">Plans and restrictions — verify on official pages</ArticleH2>
      <Prose>
        Photoroom’s Help Center describes a <strong>Free</strong> plan for personal, non-commercial
        use with limited features, plus paid self-serve plans <strong>Pro</strong>,{" "}
        <strong>Max</strong>, and <strong>Ultra</strong>, and custom <strong>Enterprise</strong>.
        Photoroom’s pricing page lists credit pools, export allowances, and which advanced tools
        consume AI credits. Background Remover is documented as a core tool that does not consume AI
        credits, while exports still count.
      </Prose>
      <Prose>
        Because prices and included credits vary by billing period and sometimes by country, open{" "}
        <ArticleLink href="https://www.photoroom.com/pricing">photoroom.com/pricing</ArticleLink> and{" "}
        <ArticleLink href="https://help.photoroom.com/en/articles/6976012-what-are-photoroom-s-plans">
          the official plans article
        </ArticleLink>{" "}
        before you subscribe. Do not rely on a blog’s remembered dollar amounts months later.
      </Prose>

      <ArticleH2 id="author-note">About the author</ArticleH2>
      <Prose>{AUTHOR_NOTE}</Prose>

      <FaqSection items={FAQ} />

      <RelatedReading
        links={[
          { href: "/blog/make-money-with-ai-ghana-2026/", label: "Make money with AI in Ghana" },
          { href: "/blog/deepai-guide/", label: "DeepAI writing and image guide" },
          { href: "/blog/best-ai-tools-in-ghana-2026/", label: "Best AI tools in Ghana 2026" },
          { href: "/marketplace/", label: "Giga3 Marketplace" },
        ]}
      />
    </>
  );
}

function Body({ post }: BlogArticleBodyProps) {
  return (
    <BlogArticleLayout
      post={post}
      toc={TOC}
      cta={
        <BlogProductCta
          title="Sell digital products on Giga3"
          description="When your visuals are ready, explore Giga3 Marketplace for digital listings with Paystack checkout in Ghana."
          href="/marketplace/"
          label="Browse Marketplace"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const PhotoroomAiTutorialBody = { Body, plainText: PLAIN_TEXT };
