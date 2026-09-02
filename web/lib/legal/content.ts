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

export const LEGAL_EFFECTIVE_DATE = "September 2, 2026";

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
        title: "5. Subscriptions and automatic renewal",
        paragraphs: [
          "Some features require a paid subscription billed monthly in Ghanaian cedis (GHS). Each subscription period lasts 30 days and includes the monthly credit allowance shown at checkout; credits refill when a new period starts.",
          "Subscriptions renew automatically. Where your payment method supports repeat charges (for example a bank card), we will charge it up to two days before your current period ends. Where it does not (for example mobile money), we will email you before your period ends so you can renew manually, and your plan will end if you do not.",
          "You can turn off automatic renewal at any time from the Subscription tab in your Wallet, or by removing your saved payment method there. Turning renewal off keeps your plan until the end of the period you have already paid for; no further charges are made.",
          "If an automatic charge fails we will notify you by email and retry for a short period. If it still cannot be completed, your plan returns to the Free tier at the end of the paid period.",
          "Subscription benefits, pricing, and limits may change with notice where required by law.",
        ],
      },
      {
        id: "payments",
        title: "6. Payments",
        paragraphs: [
          "Payments are processed by Paystack, a third-party payment provider. Card details are entered on Paystack's secure checkout and never on Giga3 AI servers.",
          "To support automatic renewal, Paystack may return a tokenised payment authorisation which we store to charge future periods. This token is not your card number; you can delete it at any time from your Wallet, which also turns off automatic renewal.",
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
    description:
      "Giga3 AI refund and cancellation policy: how automatic renewal works, how to cancel from your Wallet, and when refunds are considered.",
    sections: [
      {
        id: "general",
        title: "General policy",
        paragraphs: [
          "Subscription fees are generally non-refundable except where required by applicable law.",
        ],
      },
      {
        id: "cancellation",
        title: "Cancelling automatic renewal",
        paragraphs: [
          "Paid plans renew automatically every 30 days unless you turn renewal off. To cancel, open your Wallet, choose the Subscription tab and select “Turn off auto-renewal” (or remove your saved payment method). You keep access until the end of the period you have paid for, and nothing further is charged.",
          "Cancelling does not refund the current period. Credits already granted for that period remain available until it ends.",
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
    description:
      "Giga3 AI Acceptable Use Policy — what you may not do with our AI, social, learning and marketplace tools, and how violations are handled.",
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
  {
    slug: "ai-usage",
    title: "AI Usage Policy",
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    description:
      "How Giga3 AI generates answers, which third-party AI providers may process your prompts, how AI output is labelled, and what you should verify before relying on it.",
    intro: [
      "Giga3 AI combines several artificial-intelligence services into one platform. This policy explains, in plain language, how those services work and what they do not do.",
    ],
    sections: [
      {
        id: "providers",
        title: "1. Third-party AI providers",
        paragraphs: [
          "Prompts, attached files and relevant conversation history are sent from our servers to third-party AI providers to generate a response. Depending on the feature and configuration these may include OpenAI, Google (Gemini) and fal.ai/OpenRouter for text, and fal.ai, Replicate and Google for images and video.",
          "Requests use a server-side failover chain: if the first configured provider is unavailable or returns an eligible error, the request may be retried with the next provider. Provider credentials never leave our servers and are never sent to your browser.",
          "Each provider processes data under its own terms. We do not control how a provider operates its models; do not include passwords, payment details or other secrets in prompts.",
        ],
      },
      {
        id: "accuracy",
        title: "2. Accuracy and verification",
        paragraphs: [
          "AI output can be wrong, incomplete, outdated or biased, even when it sounds confident. Giga3 AI does not review individual answers for accuracy.",
          "Verify important facts, figures, citations, code and legal, medical or financial information with reliable sources before acting on them. Educational answers in GigaLearn are study aids, not verified curriculum material, unless a resource is explicitly marked as verified.",
        ],
      },
      {
        id: "live-web",
        title: "3. Live web and sources",
        paragraphs: [
          "When you enable Live Web, we search the public web and read publicly accessible pages to ground the answer, and we show the sources we used. A listed source means the page was consulted; it does not guarantee the statement attributed to it is correct. Open important sources yourself.",
        ],
      },
      {
        id: "labelling",
        title: "4. Labelling of AI content",
        paragraphs: [
          "Text, images and video created with Giga3 AI tools are AI-generated. When you publish AI-generated media to GigaSocial or sell it on the Marketplace, do not present it as a human-made original where that would mislead others, and follow the Acceptable Use Policy.",
        ],
      },
      {
        id: "your-content",
        title: "5. Your prompts and outputs",
        paragraphs: [
          "You keep ownership of the prompts you write and, to the extent permitted by law and the providers' terms, the outputs generated for you. We process prompts and outputs to provide the service, keep your conversation history, apply safety and abuse controls, and improve reliability.",
          "We do not sell your prompts. We do not use them to train models ourselves; third-party providers apply their own data policies.",
        ],
      },
      {
        id: "credits",
        title: "6. Credits",
        paragraphs: [
          "AI requests consume credits according to the rates shown in your account. For chat, credits are deducted only after a provider has produced a reply; if every configured provider fails and you receive our built-in fallback message instead, no credits are charged for that request.",
        ],
      },
      {
        id: "prohibited-ai",
        title: "7. Prohibited AI uses",
        bullets: [
          "Generating content that is unlawful, defamatory, hateful or sexually explicit involving minors.",
          "Creating deceptive impersonations of real people or organisations.",
          "Producing malware, exploits or instructions for serious harm.",
          "Automated bulk generation intended to spam or manipulate search engines, social platforms or the Marketplace.",
          "Attempting to extract provider credentials, system prompts or other users' data.",
        ],
      },
    ],
    outro: [
      "This policy supplements the Terms of Service and Acceptable Use Policy. Where they conflict, the stricter rule applies.",
    ],
  },
  {
    slug: "security",
    title: "Security Overview",
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    description:
      "How Giga3 AI protects accounts, payments and data: server-side secrets, signed sessions, Paystack-verified payments, rate limiting and security monitoring.",
    intro: [
      "This page describes the security practices actually in place on Giga3 AI. It is written for users and evaluators and is kept in step with the platform; it is not a certification or a guarantee.",
    ],
    sections: [
      {
        id: "accounts",
        title: "1. Accounts and sessions",
        bullets: [
          "Sessions are signed tokens issued only after you prove ownership of your email: a password check, an emailed reset link that expires after one hour, or a verified Supabase sign-in.",
          "Passwords are stored as salted scrypt hashes; we never store or log plain-text passwords.",
          "Sign-in, sign-up and reset endpoints are rate-limited, and repeated failures are recorded as security events for review.",
        ],
      },
      {
        id: "payments",
        title: "2. Payments",
        bullets: [
          "Checkout runs on Paystack. Card and mobile-money details are entered on Paystack, not on Giga3 AI.",
          "Every payment is verified server-side with Paystack before credits or plans are granted; webhook messages are checked against Paystack's signature before they are trusted.",
          "For automatic renewal we store only the tokenised authorisation Paystack returns, never a card number. You can delete it from your Wallet.",
        ],
      },
      {
        id: "secrets",
        title: "3. Keys and secrets",
        bullets: [
          "AI provider keys, payment secrets and signing secrets live only in server configuration. They are not included in the web app bundle or exposed to the browser.",
          "AI provider failover happens on the server; the browser only ever talks to Giga3 AI.",
        ],
      },
      {
        id: "transport",
        title: "4. Transport and browser protections",
        bullets: [
          "All traffic uses HTTPS with HTTP Strict Transport Security.",
          "The site sends a Content Security Policy, frame-ancestors restrictions and other hardening headers to reduce cross-site scripting and clickjacking risk.",
        ],
      },
      {
        id: "authorization",
        title: "5. Access control",
        bullets: [
          "Every request that reads or changes your data requires your session token; the server derives your identity from that token, never from values the browser sends.",
          "Marketplace downloads are released only after the server confirms you purchased the item or created it, and that the file passed review.",
          "Administrative functions require a separate admin credential.",
        ],
      },
      {
        id: "reporting",
        title: "6. Reporting a vulnerability",
        paragraphs: [
          "If you believe you have found a security issue, email hello@giga3ai.com with the details and steps to reproduce. Please give us reasonable time to investigate and fix before disclosing publicly. We do not currently run a paid bug-bounty programme.",
        ],
      },
    ],
    outro: [
      "No online service can guarantee absolute security. We continue to review and improve these controls and will update this page when they change.",
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
