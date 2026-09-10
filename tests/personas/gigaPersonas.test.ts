import { describe, expect, it } from "vitest";
import {
  GIGA_PERSONA_IDS,
  getPersonaDefinition,
  isValidPersonaId,
  listPersonasForProduct,
  personaDefaultResearchCapability,
  personaSystemPromptAddon,
  resolvePersonaForSend,
} from "../../convex/gigaPersonas";

describe("Giga3 persona engine", () => {
  it("defines twelve chat personas", () => {
    expect(GIGA_PERSONA_IDS.length).toBe(12);
    expect(listPersonasForProduct("chat").length).toBeGreaterThanOrEqual(10);
  });

  it("validates persona ids", () => {
    expect(isValidPersonaId("ghana_teacher")).toBe(true);
    expect(isValidPersonaId("fake_persona")).toBe(false);
  });

  it("Ghana news analyst uses ghana_news research and news mode", () => {
    const persona = getPersonaDefinition("ghana_news_analyst");
    expect(persona.defaultMode).toBe("news");
    expect(personaDefaultResearchCapability("ghana_news_analyst")).toBe("ghana_news");
    expect(personaSystemPromptAddon("ghana_news_analyst")).toContain("Ghana News Analyst");
    expect(personaSystemPromptAddon("ghana_news_analyst")).toContain("Verified");
  });

  it("resolvePersonaForSend applies persona defaults", () => {
    const resolved = resolvePersonaForSend({
      personaId: "bece_tutor",
      mode: "general",
    });
    expect(resolved.personaId).toBe("bece_tutor");
    expect(resolved.mode).toBe("waec");
  });

  it("BECE tutor warns against fake official papers", () => {
    expect(personaSystemPromptAddon("bece_tutor")).toContain("official BECE");
  });
});
