export type AgeBand = "kg" | "primary" | "jhs" | "shs" | "adult";

export type AgeUiConfig = {
  band: AgeBand;
  label: string;
  buttonClass: string;
  stemClass: string;
  optionClass: string;
  useVisualCues: boolean;
  shortExplanations: boolean;
};

export function ageBandFromLevel(level: string): AgeBand {
  const id = level.toLowerCase();
  if (id === "kg" || id.includes("nursery") || id.includes("kg")) return "kg";
  if (id === "primary" || id.includes("primary")) return "primary";
  if (id.startsWith("jhs") || id === "jhs") return "jhs";
  if (id.startsWith("shs") || id === "shs") return "shs";
  if (id === "university") return "adult";
  return "jhs";
}

export function ageUiConfig(band: AgeBand): AgeUiConfig {
  switch (band) {
    case "kg":
      return {
        band,
        label: "KG / Nursery",
        buttonClass: "min-h-14 text-lg rounded-2xl",
        stemClass: "text-xl font-bold",
        optionClass: "min-h-16 text-lg rounded-2xl",
        useVisualCues: true,
        shortExplanations: true,
      };
    case "primary":
      return {
        band,
        label: "Primary",
        buttonClass: "min-h-12 text-base rounded-xl",
        stemClass: "text-lg font-semibold",
        optionClass: "min-h-14 text-base rounded-xl",
        useVisualCues: true,
        shortExplanations: true,
      };
    case "jhs":
      return {
        band,
        label: "JHS",
        buttonClass: "min-h-11 text-sm rounded-xl",
        stemClass: "text-base font-semibold",
        optionClass: "min-h-12 text-sm rounded-xl",
        useVisualCues: false,
        shortExplanations: false,
      };
    case "shs":
      return {
        band,
        label: "SHS",
        buttonClass: "min-h-11 text-sm rounded-xl",
        stemClass: "text-base font-medium",
        optionClass: "min-h-11 text-sm rounded-xl",
        useVisualCues: false,
        shortExplanations: false,
      };
    default:
      return {
        band: "adult",
        label: "Advanced",
        buttonClass: "min-h-11 text-sm rounded-xl",
        stemClass: "text-base",
        optionClass: "min-h-11 text-sm rounded-xl",
        useVisualCues: false,
        shortExplanations: false,
      };
  }
}
