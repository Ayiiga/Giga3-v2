import { BlogArticleLayout } from "@/components/blog/BlogHeader";
import { BlogProductCta } from "@/components/blog/BlogTableOfContents";
import type { ReactNode } from "react";
import { ArticleFigure, ArticleH2, ArticleLink, Prose } from "@/components/seo/SeoArticleParts";
import type { BlogArticleBodyProps } from "@/lib/blog/posts";

type Section = { id: string; label: string; paragraphs: string[] };

function productGuide(
  intro: string,
  sections: Section[],
  cta: { title: string; description: string; href: string; label: string },
  figures: readonly [ReactNode, ReactNode],
  reference?: { href: string; label: string },
) {
  function Body({ post }: BlogArticleBodyProps) {
    return (
      <BlogArticleLayout post={post} toc={sections} cta={<BlogProductCta {...cta} />}>
        <Prose>{intro}</Prose>
        {sections.map(({ id, label, paragraphs }, index) => (
          <section key={id}>
            <ArticleH2 id={id}>{label}</ArticleH2>
            {paragraphs.map((paragraph) => <Prose key={paragraph}>{paragraph}</Prose>)}
            {figures[index]}
          </section>
        ))}
        {reference && <Prose><ArticleLink href={reference.href}>{reference.label}</ArticleLink></Prose>}
      </BlogArticleLayout>
    );
  }
  return { Body, plainText: [intro, ...sections.flatMap(({ paragraphs }) => paragraphs)].join(" ") };
}

export const GigaSocialAwardsGuide = productGuide(
  "A good creator can teach you a skill, make you laugh, or tell a story that stays with you. GigaSocial Awards gives people a way to recognise creators across Ghana. Here’s how to prepare a nomination and help supporters take part.",
  [
    { id: "nominate", label: "Prepare a nomination", paragraphs: [
      "Open the awards page and check which categories and nomination windows are active. Choose the category that best fits the work. A creator who posts clear science demonstrations, for example, should look for a category that recognises educational content.",
      "Write a short description in your own words. Say who the creator is, what they make and who benefits from their work. Choose a public example that someone can watch or read without extra context. If you are nominating someone else, check their name and get permission before sharing a photo or any private information.",
    ] },
    { id: "vote", label: "Share the candidate link and vote", paragraphs: [
      "Once a candidate page is visible, share its official link so supporters can check the category and see the creator’s work. Tell people why you support the creator and let them decide. A message such as “Her short lessons helped my class understand fractions” gives people a reason to open the page.",
      "Nominations and voting are free. Optional promotional packages pay for visibility. Votes are cast separately through the awards page. Check the current event page for participation rules, deadlines and any prize information.",
    ] },
    { id: "check", label: "Before you submit or share", paragraphs: [
      "Open the link on a phone and confirm that the creator’s name, category and example are clear. If you post the link in a group, add a short description so people know where it leads and why you shared it.",
    ] },
  ],
  { title: "Explore GigaSocial Awards", description: "See the current event, categories and nomination options.", href: "/gigasocial/awards/", label: "Open GigaSocial Awards" },
  [
    <ArticleFigure key="support-small-business-phone" src="/images/blog/support-small-business-phone.jpg" alt="A person using a phone to share their work" />,
    <ArticleFigure key="support-fact-check-moment" src="/images/blog/support-fact-check-moment.jpg" alt="A reader checking information on a smartphone" />,
  ],
);

export const GigaLearnAcademyGuide = productGuide(
  "GigaLearn Academy offers five learning paths for teachers and beginners building digital skills. Start with one course and choose a small task you can finish and explain to another person.",
  [
    { id: "teaching", label: "Teaching", paragraphs: [
      "For current and aspiring basic-school teachers. Work on lesson planning, active learning and formative assessment. Start with a lesson you teach this week. Write one measurable objective, plan a short activity and prepare an exit question that shows whether learners reached the objective.",
    ] },
    { id: "ai", label: "Artificial Intelligence", paragraphs: [
      "Learn how AI systems use examples, how to write a useful prompt and how to check an output. Ask an AI tool to summarise a short passage you already understand. Verify two claims against the passage and record anything the tool added or missed.",
    ] },
    { id: "web", label: "Web and PWA Development", paragraphs: [
      "Learn how to structure a web page, make it usable on a phone and plan what a progressive web app should show offline. Build a simple school club page with a heading, a schedule and a contact link. Test it with a narrow screen and a keyboard.",
    ] },
    { id: "mobile", label: "Mobile Development", paragraphs: [
      "Map a task across phone screens and plan for interruptions. Sketch a homework notes app with a list, an editor and a saved state. Decide what happens when someone presses Back with an unsaved draft or reopens the app after an interruption.",
    ] },
    { id: "robotics", label: "Robotics and Digital Technology", paragraphs: [
      "Explore how sensors, controllers and outputs work together. In a simulator, plan a lamp that turns on when a room gets dark. Trace the signal from the sensor to the lamp and test what happens when the sensor reading is missing.",
    ] },
    { id: "start", label: "Pick your first task", paragraphs: [
      "Choose the course that fits a problem you already have. After your first lesson, save the plan, sketch or test notes you made. Ask a classmate or colleague to try it and use their feedback to make one improvement.",
    ] },
  ],
  { title: "Browse GigaLearn Academy", description: "Choose a learning path and start with one practical task.", href: "https://gigalearn-academy-hub.courteousfudge2.chatgpt.site/#courses", label: "Browse Academy courses" },
  [
    <ArticleFigure key="support-coding-practice-desk" src="/images/blog/support-coding-practice-desk.jpg" alt="Hands typing on a laptop at a study desk" />,
    <ArticleFigure key="support-team-project-build" src="/images/blog/support-team-project-build.jpg" alt="A team collaborating on a practical project" />,
  ],
);

export const Giga3ExamRevisionGuide = productGuide(
  "A useful revision session ends with a clear idea of what to study next. Use Giga3 AI’s Practice Centre to work through one BECE or WASSCE subject at a time and turn each missed question into a specific follow-up task.",
  [
    { id: "attempt", label: "Spend 10 minutes answering", paragraphs: [
      "Choose your exam and subject. Pick a topic you have already covered in class and attempt the questions before reading the explanations. On paper, write down your calculation or the reason for your choice. Mark any answer you guessed so you can review it even if you got it right.",
    ] },
    { id: "review", label: "Spend 10 minutes reviewing", paragraphs: [
      "Sort mistakes by cause. You might have missed a definition, used the wrong method or misread the question. Give each mistake one next action. If you found the area of a garden when the question asked for its perimeter, draw a second garden and label the boundary before calculating.",
      "For English comprehension, underline the words in the passage that support your answer. For Science, identify the principle involved and include units where needed. For Social Studies, explain how your example supports the point you are making.",
    ] },
    { id: "retry", label: "Spend five minutes on a fresh question", paragraphs: [
      "Try a different question on the same topic. Use a fresh calculation or example and explain the method in your own words. Revisit the topic a day or two later to see what you can still do from memory.",
      "Set aside time for written answers too. Use WAEC Ghana’s guidelines and chief examiners’ reports to understand question formats and common mistakes, and ask a teacher to review any answer you are unsure how to mark.",
    ] },
  ],
  { title: "Start a focused practice session", description: "Choose BECE or WASSCE and revise one subject at a time.", href: "/gigalearn/exam/practice/", label: "Open Practice Centre" },
  [
    <ArticleFigure key="support-mobile-learning" src="/images/blog/support-mobile-learning.jpg" alt="A learner studying with a mobile phone" />,
    <ArticleFigure key="support-skills-roadmap-notebook" src="/images/blog/support-skills-roadmap-notebook.jpg" alt="A notebook used to plan the next learning steps" />,
  ],
  { href: "https://waecgh.org/chief-examiners-report/", label: "Read WAEC Ghana’s chief examiners’ reports" },
);

export const GhanaCreatorEarningsGuide = productGuide(
  "A shop owner in Kumasi needs a short video showing how to find her shop. A teacher in Tamale needs a simple graphic for a revision class. If you can make either piece of content well, you have something specific to offer. Here are four ways to turn original content into an earning opportunity, plus what Ghanaian creators can do now for GigaSocial’s December Awards.",
  [
    { id: "client-work", label: "1. Sell one service you can demonstrate", paragraphs: [
      "Pick one service you can deliver with the tools you already have. Try editing a 30-second product video, filming a short shop tour or designing three social posts for a local business. Make a sample using material you own or have permission to use.",
      "Send the business one example and a clear offer. State what you’ll deliver, when you’ll deliver it, how many revisions are included and what the work costs. Ask what customers usually want to know, then make the video answer that question.",
    ] },
    { id: "sponsors", label: "2. Pitch a sponsor that fits your audience", paragraphs: [
      "If you teach mobile photography, a local accessories shop may be a better fit than a brand your viewers rarely use. Show the sponsor one relevant post and your actual reach or engagement. Explain the idea for the sponsored post and how you’ll report results.",
      "Disclose paid partnerships clearly. Agree in advance on how the business may reuse the video, especially if it wants to turn the clip into an advertisement.",
    ] },
    { id: "products", label: "3. Turn a repeated question into a product", paragraphs: [
      "If people keep asking for your editing checklist, make a simple one-page version. If they ask how you teach a topic, consider a short original worksheet or a small live session. Let a few people try it first and use their feedback before charging.",
      "Work out what you keep after data, transport, production and payment costs. For example, a GH₵200 editing job with GH₵50 in direct costs leaves GH₵150 before you account for your time or other expenses. The figures are illustrative.",
    ] },
    { id: "gigasocial", label: "4. Give viewers one clear way to support you", paragraphs: [
      "Use your GigaSocial profile as a portfolio. Choose a recognisable profile photo, describe the kind of work you make and share two or three posts that demonstrate it. When tips are available on your profile, tell supporters what their tips help you make next.",
      "A tip is voluntary support. Keep your client prices, sponsorship agreements and any future awards participation terms clear so supporters know what they’re paying for.",
    ] },
    { id: "december-awards", label: "Get ready for GigaSocial Awards in December 2026", paragraphs: [
      "GigaSocial is preparing its December 2026 Creator Edition to recognise original work by creators in Ghana. Pick three posts that best show what you do. For each one, write a sentence about who it helped or why you made it. Check that you can share the links from a phone.",
      "The Awards page has a December preview and a sponsorship inquiry link. Nomination dates, voting rules and prize details are pending confirmation. If you run a business that serves creators, use the preview to ask about sponsorship.",
    ] },
    { id: "first-week", label: "Your first seven days", paragraphs: [
      "Spend the first two days making a sample. On day three, publish it and explain the problem it solves. Over the next two days, send it to three businesses or clients that could use similar work. Use the weekend to follow up and improve the offer based on what people asked you.",
    ] },
  ],
  { title: "See the December Creator Edition", description: "Get the latest GigaSocial Awards updates or ask about sponsoring the edition.", href: "/gigasocial/awards/#december-2026", label: "Open the December Awards preview" },
  [
    <ArticleFigure key="support-creator-editing" src="/images/blog/support-creator-editing.jpg" alt="Creator editing video at a desk with a laptop and phone" />,
    <ArticleFigure key="support-mobile-learning" src="/images/blog/support-mobile-learning.jpg" alt="A person using a phone to learn a new skill" />,
  ],
);

export const DollarToCediGuide = productGuide(
  "How much is $100 in Ghana cedis? Multiply 100 by the exchange rate quoted in Ghana cedis per US dollar. At an example rate of GH₵12 per dollar, $100 equals GH₵1,200 before fees. For a current benchmark, check the Bank of Ghana’s dated USDGHS row, then use the quote from the provider handling your transaction.",
  [
    { id: "check-rate", label: "Where to check the dollar-to-cedi rate", paragraphs: [
      "Open the Bank of Ghana’s Daily Interbank FX Rates page. Look for US Dollar or USDGHS and check the date on that row. The table shows buying, selling and mid rates. The mid rate gives you a reference point. For a transaction, ask the provider for the rate it will apply to you.",
      "Check the direction. If you hand over US dollars and receive cedis, the provider is buying your dollars. If you pay cedis to receive US dollars, it is selling dollars to you. Ask for the amount you will receive after any fee.",
    ] },
    { id: "conversion", label: "Convert $1, $10, $50 or $100 to cedis", paragraphs: [
      "At an illustrative rate of GH₵12 per US dollar, $1 is GH₵12, $10 is GH₵120, $50 is GH₵600 and $100 is GH₵1,200. Replace 12 with your actual quoted rate before using the result.",
      "To go the other way, divide the cedi amount by the rate. At the same example rate, GH₵600 ÷ 12 equals $50 before fees.",
    ] },
    { id: "compare-quotes", label: "Compare the amount that actually arrives", paragraphs: [
      "Ask both providers for quotes using the same dollar amount and payout method. Compare the total you pay, the final amount the recipient gets, the expected delivery time and how long the quote is valid.",
      "For example, suppose two providers convert the full $100 and deduct fees from the cedi payout. One quotes GH₵12 per dollar with a GH₵30 fee, leaving GH₵1,170. The other quotes GH₵11.85 per dollar with a GH₵5 fee, leaving GH₵1,180. The second quote delivers GH₵10 more in this example.",
    ] },
    { id: "freelance", label: "If a client is paying you in dollars", paragraphs: [
      "Before quoting a job, write down your expected payment in dollars, any receiving charges and the cedi amount you need to cover your costs. Save the final receipt and note how much arrived. Use that figure to review what you earned after direct costs.",
    ] },
  ],
  { title: "Check the latest official USDGHS benchmark", description: "Look for the US Dollar row and its date in the Bank of Ghana’s daily interbank table.", href: "https://www.bog.gov.gh/treasury-and-the-markets/daily-interbank-fx-rates/", label: "Open Bank of Ghana FX rates" },
  [
    <ArticleFigure key="support-small-business-phone" src="/images/blog/support-small-business-phone.jpg" alt="A small business owner using a phone during the working day" />,
    <ArticleFigure key="support-skills-roadmap-notebook" src="/images/blog/support-skills-roadmap-notebook.jpg" alt="An open notebook for writing down calculations and plans" />,
  ],
  { href: "/blog/how-to-make-money-as-a-content-creator-in-ghana/", label: "Read the Ghana content creator earnings guide" },
);
