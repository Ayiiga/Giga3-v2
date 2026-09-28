import { describe, expect, it } from "vitest";
import {
  applyGhanaNewsSearchAnswer,
  GHANA_NEWS_INSUFFICIENT_EVIDENCE,
  resolveSafeChatRoute,
} from "../../convex/newsEvidence/userContextRouting";

const MTN_PASTE =
  "MTN Ghana Heroes of Change Season 8 is open for nominations until 19 October 2026. The overall winner receives GHS400,000 and each category winner receives GHS200,000. Categories include Education, Health, Economic Empowerment, Sustainability and Digital Innovation. Nominate via the MTN Ghana website or MTN Service Centres.";

const MTN_TODAY_PASTE =
  "Dear Valued Customer, Nominations for Heroes of Change Season 8 will close on 19 October 2026. Hurry, nominate your hero today! Visit MTN Ghana's website - www.mtn.com.gh.";

describe("Ghana news search route", () => {
  const query = "What is happening in Ghana";

  it("routes the short Ghana question to news_search, not small talk", () => {
    expect(query.length).toBe(26);
    expect(resolveSafeChatRoute(query)).toBe("news_search");
    expect(resolveSafeChatRoute("Hello")).toBe("small_talk");
    expect(resolveSafeChatRoute(MTN_TODAY_PASTE)).toBe("user_context");
    expect(resolveSafeChatRoute(MTN_PASTE)).toBe("user_context");
    expect(resolveSafeChatRoute("Ghana")).toBe("general");
    expect(resolveSafeChatRoute("today")).toBe("general");
    expect(resolveSafeChatRoute("What is happening today?")).toBe("general");
    expect(
      resolveSafeChatRoute("I visited Ghana today with my family and loved the food")
    ).toBe("general");
    expect(resolveSafeChatRoute("What's the latest Ghana news today?")).toBe("news_search");
    expect(resolveSafeChatRoute("Latest Ghana headlines today")).toBe("news_search");
  });

  it("uses the insufficient-evidence sentence when search returns nothing", () => {
    expect(
      applyGhanaNewsSearchAnswer({
        query,
        resultCount: 0,
        answer:
          "For the latest news and events happening in Ghana, I recommend checking trusted news sources. I can answer from general knowledge.",
      })
    ).toBe(GHANA_NEWS_INSUFFICIENT_EVIDENCE);
  });

  it("shows retrieved reports instead of a check-the-news hedge", () => {
    const reports =
      "Parliament opened a new sitting in Accra.\nSource: [Graphic Online](https://www.graphic.com.gh/parliament)";
    expect(
      applyGhanaNewsSearchAnswer({
        query,
        resultCount: 1,
        answer: "I recommend checking trusted news sources and can only use general knowledge.",
        reports,
      })
    ).toBe(reports);
  });
});
