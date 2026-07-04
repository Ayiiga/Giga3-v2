export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  effectiveDate: string;
  description: string;
  intro?: readonly string[];
  sections: readonly LegalSection[];
  outro?: readonly string[];
};

export const LEGAL_EFFECTIVE_DATE = "July 4, 2026";

export const legalDocuments: readonly LegalDocument[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    description: "Giga3 AI Terms of Service — eligibility, subscriptions, payments, and user responsibilities.",
    sections: [
      {
        id: "acceptance",
        title: "1. Acceptance of Terms",
        paragraphs: [
          'By accessing or using Giga3 AI ("the Service"), you agree to these Terms of Service. If you do not agree, please do not use the Service.',
        ],
      },
      {
        id: "eligibility",
        title: "2. Eligibility",
        paragraphs: [
          "You must meet the minimum age required by the laws of your jurisdiction to use Giga3 AI. If you are under the required age, you must have permission from a parent or legal guardian.",
        ],
      },
      {
        id: "accounts",
        title: "3. User Accounts",
        paragraphs: [
          "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.",
        ],
      },
      {
        id: "ai-services",
        title: "4. AI Services",
        paragraphs: [
          "Giga3 AI provides AI-powered text, image generation, and other productivity tools. AI-generated content may be inaccurate or incomplete and should be reviewed before relying on it for important decisions.",
        ],
      },
      {
        id: "subscriptions",
        title: "5. Subscriptions",
        paragraphs: [
          "Some features require a paid subscription. Subscription benefits, pricing, and limits may change with notice where required by law.",
        ],
      },
      {
        id: "payments",
        title: "6. Payments",
        paragraphs: [
          "Payments are securely processed by third-party payment providers. Giga3 AI does not store your complete payment card information.",
        ],
      },
      {
        id: "user-content",
        title: "7. User Content",
        paragraphs: [
          "You retain ownership of the content you submit. By using the Service, you grant Giga3 AI permission to process your content solely to provide, maintain, and improve the Service.",
        ],
      },
      {
        id: "prohibited",
        title: "8. Prohibited Activities",
        paragraphs: ["You agree not to:"],
        bullets: [
          "Violate any applicable laws.",
          "Attempt unauthorized access to the Service.",
          "Distribute malware or harmful code.",
          "Abuse, disrupt, or overload the platform.",
          "Use the Service to infringe intellectual property rights.",
          "Generate or distribute unlawful or harmful content.",
        ],
      },
      {
        id: "ip",
        title: "9. Intellectual Property",
        paragraphs: [
          "The Giga3 AI platform, branding, software, and related materials are owned by Giga3 AI or its licensors.",
        ],
      },
      {
        id: "availability",
        title: "10. Service Availability",
        paragraphs: [
          "We strive for reliable service but do not guarantee uninterrupted or error-free operation.",
        ],
      },
      {
        id: "liability",
        title: "11. Limitation of Liability",
        paragraphs: [
          "To the maximum extent permitted by law, Giga3 AI is not liable for indirect, incidental, or consequential damages arising from use of the Service.",
        ],
      },
      {
        id: "termination",
        title: "12. Termination",
        paragraphs: [
          "We may suspend or terminate accounts that violate these Terms or applicable laws.",
        ],
      },
      {
        id: "changes",
        title: "13. Changes to Terms",
        paragraphs: [
          "We may update these Terms from time to time. Continued use of the Service after updates constitutes acceptance of the revised Terms.",
        ],
      },
      {
        id: "contact",
        title: "14. Contact",
        paragraphs: [
          "Questions regarding these Terms should be directed to Giga3 AI through the official support channels listed on the website.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    description:
      "How Giga3 AI collects, uses, stores, and protects your information on the website and PWA.",
    intro: [
      "Welcome to Giga3 AI. Your privacy is important to us. This Privacy Policy explains how we collect, use, store, and protect your information when you use the Giga3 AI website and Progressive Web App (PWA).",
    ],
    sections: [
      {
        id: "information-collected",
        title: "Information We Collect",
        paragraphs: ["We may collect:"],
        bullets: [
          "Account information such as your name, email address, and profile details.",
          "Chat prompts and responses to provide and improve our AI services.",
          "Subscription and payment information processed securely by our payment providers. Giga3 AI does not store your full payment card details.",
          "Device information, browser type, operating system, IP address, and usage analytics.",
          "Files and images you upload for AI processing.",
        ],
      },
      {
        id: "how-we-use",
        title: "How We Use Your Information",
        paragraphs: ["We use your information to:"],
        bullets: [
          "Provide AI chat and image generation services.",
          "Process subscriptions and payments.",
          "Improve our products, features, and user experience.",
          "Detect fraud, abuse, and security threats.",
          "Provide customer support.",
          "Comply with legal obligations.",
        ],
      },
      {
        id: "ai-services",
        title: "AI Services",
        paragraphs: [
          "Your prompts and uploaded content may be processed by trusted third-party AI providers to generate responses or images. We work with providers that maintain appropriate security and privacy standards.",
        ],
      },
      {
        id: "news-web",
        title: "News and Web Content",
        paragraphs: [
          "When live news or web search features are used, Giga3 AI may retrieve information from trusted public sources. We strive to provide accurate information and cite sources where appropriate, but we cannot guarantee the accuracy or completeness of third-party content.",
        ],
      },
      {
        id: "data-security",
        title: "Data Security",
        paragraphs: [
          "We use industry-standard security measures to protect your data from unauthorized access, alteration, disclosure, or destruction. While we take reasonable precautions, no online service can guarantee absolute security.",
        ],
      },
      {
        id: "data-retention",
        title: "Data Retention",
        paragraphs: [
          "We retain your information only for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our policies.",
        ],
      },
      {
        id: "your-rights",
        title: "Your Rights",
        paragraphs: ["Depending on your location, you may have the right to:"],
        bullets: [
          "Access your personal data.",
          "Correct inaccurate information.",
          "Delete your account and personal data.",
          "Request a copy of your data.",
          "Withdraw consent where applicable.",
        ],
      },
      {
        id: "cookies",
        title: "Cookies",
        paragraphs: [
          "We use cookies and similar technologies to keep you signed in, improve performance, remember your preferences, and analyze usage. You can manage cookies through your browser settings.",
        ],
      },
      {
        id: "children",
        title: "Children's Privacy",
        paragraphs: [
          "Giga3 AI is not intended for children under the age required by applicable law in their jurisdiction. We do not knowingly collect personal information from children without appropriate consent.",
        ],
      },
      {
        id: "changes",
        title: "Changes to This Policy",
        paragraphs: [
          "We may update this Privacy Policy from time to time. Significant changes will be communicated through the website or application.",
        ],
      },
      {
        id: "contact",
        title: "Contact Us",
        paragraphs: [
          "If you have any questions about this Privacy Policy or your personal data, please contact the Giga3 AI support team through the official support page or contact email listed on the website.",
        ],
      },
    ],
    outro: [
      "By using Giga3 AI, you acknowledge that you have read and agree to this Privacy Policy.",
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    description: "How Giga3 AI uses cookies and similar technologies.",
    intro: ["Giga3 AI uses cookies and similar technologies to:"],
    sections: [
      {
        id: "uses",
        title: "Cookie uses",
        bullets: [
          "Keep users signed in.",
          "Remember preferences.",
          "Improve website performance.",
          "Analyze usage trends.",
          "Enhance security.",
          "Support essential platform functionality.",
        ],
      },
    ],
    outro: [
      "You can manage or disable cookies through your browser settings. Some features may not function properly if essential cookies are disabled.",
    ],
  },
  {
    slug: "refunds",
    title: "Refund Policy",
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    description: "Giga3 AI subscription refund eligibility and process.",
    sections: [
      {
        id: "general",
        title: "General policy",
        paragraphs: [
          "Subscription fees are generally non-refundable except where required by applicable law.",
        ],
      },
      {
        id: "considered",
        title: "Refund requests may be considered if",
        bullets: [
          "You were charged due to a billing error.",
          "You were charged multiple times for the same subscription.",
          "The Service could not be provided because of a verified technical issue caused by Giga3 AI.",
        ],
      },
      {
        id: "not-provided",
        title: "Refunds are generally not provided for",
        bullets: [
          "Partial subscription periods.",
          "Change of mind.",
          "Failure to cancel before renewal.",
          "Violations of the Terms of Service that result in account suspension.",
        ],
      },
      {
        id: "processing",
        title: "Processing",
        paragraphs: [
          "Approved refunds will be processed using the original payment method where possible.",
        ],
      },
    ],
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    description: "Responsible and lawful use of Giga3 AI.",
    intro: ["You agree to use Giga3 AI responsibly and lawfully.", "You must not use Giga3 AI to:"],
    sections: [
      {
        id: "prohibited",
        title: "Prohibited uses",
        bullets: [
          "Break the law.",
          "Commit fraud or deception.",
          "Harass, threaten, or abuse others.",
          "Distribute malware or malicious software.",
          "Attempt unauthorized access to systems or accounts.",
          "Spam or automate abusive activity.",
          "Infringe copyrights, trademarks, or other intellectual property rights.",
          "Upload viruses or harmful code.",
          "Circumvent subscription limits or security measures.",
          "Generate content that promotes illegal activities.",
        ],
      },
    ],
    outro: [
      "Users are responsible for verifying AI-generated content before relying on it.",
      "Violation of this policy may result in warnings, suspension, or permanent termination of your account.",
      "Giga3 AI reserves the right to investigate suspected misuse and cooperate with lawful requests from authorities where required by applicable law.",
    ],
  },
] as const;

export const legalDocumentBySlug = Object.fromEntries(
  legalDocuments.map((doc) => [doc.slug, doc])
) as Record<(typeof legalDocuments)[number]["slug"], (typeof legalDocuments)[number]>;

export const legalNavLinks = legalDocuments.map((doc) => ({
  href: `/legal/${doc.slug}/`,
  label: doc.title,
}));
