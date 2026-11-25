type Trial = { label: string; value: number; readings?: string };

export type WorldPractical = {
  id: string;
  title: string;
  tone: "blue" | "gold" | "green" | "pink" | "violet";
  introduction: string;
  prediction: string;
  trials: readonly [Trial, Trial];
  unit: string;
  measure: string;
  resultType: "Calculated results" | "Idealised model" | "Example trial results";
  correct: 0 | 1;
  challenge: string;
  choices: readonly [string, string];
  answer: 0 | 1;
  explanation: string;
  hint: string;
  mission: string;
  award: string;
  achievement: string;
};

export const WORLD_PRACTICALS: Record<"foundation" | "exploration" | "mastery", readonly [WorldPractical, WorldPractical]> = {
  foundation: [
    {
      id: "measure", title: "Paper Clip Ruler", tone: "blue",
      introduction: "Measure two paper strips using paper clips of the same size.",
      prediction: "Which strip will need more paper clips?",
      trials: [{ label: "Strip A", value: 4 }, { label: "Strip B", value: 7 }],
      unit: "clips", measure: "Length in paper clips", resultType: "Calculated results", correct: 1,
      challenge: "What makes the two lengths easy to compare?",
      choices: ["Use clips of different sizes", "Use equal clips with no gaps"], answer: 1,
      explanation: "Seven equal clips cover more length than four. Start at the edge and place the clips end to end.",
      hint: "Think about what happens if you leave a big gap between two clips.",
      mission: "With a grown-up or teacher, line up equal paper strips or blocks along two books. Count the units and tell someone which book is longer.",
      award: "Brilliant Measuring", achievement: "You compared two lengths using the same unit.",
    },
    {
      id: "market", title: "Mini Market", tone: "gold",
      introduction: "Use model prices of GH₵2 per orange and GH₵4 per mango.",
      prediction: "Which basket costs more?",
      trials: [{ label: "Three oranges", value: 6, readings: "2 + 2 + 2" }, { label: "Two mangoes", value: 8, readings: "4 + 4" }],
      unit: "cedis", measure: "Basket cost", resultType: "Calculated results", correct: 1,
      challenge: "You have GH₵7. Which basket can you buy?",
      choices: ["Three oranges", "Two mangoes"], answer: 0,
      explanation: "Three oranges cost GH₵6, so you have GH₵1 left. The mangoes cost GH₵8.",
      hint: "Compare each basket's total with seven.",
      mission: "Make pretend prices for fruits or classroom objects. Write a shopping list and use paper money to work out how much change you should get.",
      award: "Excellent Shopper", achievement: "You compared prices and stayed within your budget.",
    },
  ],
  exploration: [
    {
      id: "shadow", title: "Shadow Lab", tone: "pink",
      introduction: "In this model, a small light source and a screen stay 80 cm apart. Move the same 4 cm object between them.",
      prediction: "Which position makes a taller shadow?",
      trials: [{ label: "20 cm from the light", value: 16 }, { label: "40 cm from the light", value: 8 }],
      unit: "cm", measure: "Shadow height", resultType: "Idealised model", correct: 0,
      challenge: "Which change made the shadow taller in the model?",
      choices: ["Moving the object farther from the light", "Moving the object closer to the light"], answer: 1,
      explanation: "Light rays spread out from the source. Moving the object closer to the light blocks a wider spread of rays by the time they reach the screen.",
      hint: "Look at which position produced the 16 cm shadow.",
      mission: "With adult supervision, keep a torch and a wall in place. Move a cardboard shape and measure its shadow at two positions. Keep the torch pointed at the wall.",
      award: "Excellent Light Investigator", achievement: "You changed one variable and compared shadow sizes.",
    },
    {
      id: "bridge", title: "Paper Bridge Challenge", tone: "green",
      introduction: "Compare a flat sheet and an accordion-folded sheet across the same gap. Each model test uses equally sized sheets and identical counters.",
      prediction: "Which bridge do you expect to hold more counters?",
      trials: [{ label: "Flat paper", value: 2 }, { label: "Accordion folds", value: 7 }],
      unit: "counters", measure: "Counters held before collapse", resultType: "Example trial results", correct: 1,
      challenge: "Which setup helps us test the effect of folding?",
      choices: ["Same paper and same gap", "Thicker paper and a smaller gap for the folded bridge"], answer: 0,
      explanation: "Keeping the paper and gap the same helps isolate the effect of folding. The folds stiffen the bridge. Your results will depend on how you build and load it.",
      hint: "If you change the gap as well, what else might explain the result?",
      mission: "Build two bridges between books, close to the table. Add identical counters one by one in the centre, and write down how many each held. Repeat the test.",
      award: "Brilliant Bridge Builder", achievement: "You compared structures and identified how to keep the test fair.",
    },
  ],
  mastery: [
    {
      id: "soil", title: "Shade Data Lab", tone: "violet",
      introduction: "Compare sample soil readings at midday, taken at the same depth in matched shaded and unshaded spots on three days.",
      prediction: "Which site do you expect to have the higher mean temperature?",
      trials: [{ label: "Shaded soil", value: 28, readings: "27, 29, 28 °C" }, { label: "Unshaded soil", value: 32, readings: "31, 33, 32 °C" }],
      unit: "°C", measure: "Mean soil temperature", resultType: "Example trial results", correct: 1,
      challenge: "What conclusion is supported by this sample?",
      choices: ["Unshaded soil averaged 4 °C warmer at these sites", "Unshaded soil is always exactly 4 °C warmer"], answer: 0,
      explanation: "The means differ by 32 − 28 = 4 °C. The readings support a comparison for these sites and days.",
      hint: "Compare the two means, then think about how many days and places were measured.",
      mission: "Plan a teacher-supervised test with two comparable sites. Agree on measurement depth, time of day and number of repeats before taking readings with a suitable school thermometer.",
      award: "Brilliant Data Analyst", achievement: "You interpreted mean values and kept your conclusion within the evidence.",
    },
    {
      id: "ramp", title: "Ramp Investigation", tone: "green",
      introduction: "Release the same toy car from rest at the same mark on the board. Keep the floor surface fixed while you change the ramp height.",
      prediction: "Which ramp height do you expect to give a greater mean distance along the floor?",
      trials: [{ label: "Low ramp", value: 40, readings: "38, 41, 41 cm" }, { label: "High ramp", value: 65, readings: "62, 65, 68 cm" }],
      unit: "cm", measure: "Mean distance past the ramp", resultType: "Example trial results", correct: 1,
      challenge: "Why release the car from rest without pushing it?",
      choices: ["It guarantees that every run goes the same distance", "It avoids adding a push that could change the distance"], answer: 1,
      explanation: "A push can add different amounts of energy each time. Releasing from rest gives a fairer comparison of the ramp heights.",
      hint: "Think of what a stronger push would do even if the ramp stayed the same.",
      mission: "Use a short board on a stable stack of books and a clear floor. With a teacher, compare three runs at each of two low heights. Record distances and compare the means.",
      award: "Excellent Experiment Designer", achievement: "You identified a control and used repeated trials to compare results.",
    },
  ],
};
