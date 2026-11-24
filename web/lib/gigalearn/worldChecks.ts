import type { LEARNING_WORLDS } from "./learningWorlds";

export type WorldId = (typeof LEARNING_WORLDS)[number]["id"];

type WorldCheck = {
  prompt: string;
  choices: [string, string, string];
  answer: number;
  hints: [string, string];
  explanation: string;
  transfer: string;
};

const checks: Record<WorldId, [WorldCheck, WorldCheck]> = {
  discovery: [
    {
      prompt: "A round orange can roll in lots of directions. Which solid shape is it like?",
      choices: ["Circle", "Sphere", "Cube"],
      answer: 1,
      hints: ["Think about what the orange looks like when you turn it over.", "A circle is flat. Look for the name of a solid that is round all the way around."],
      explanation: "The orange is shaped like a sphere. A circle is a flat shape.",
      transfer: "Find a different object that is shaped like a sphere. Show how you know.",
    },
    {
      prompt: "You trace one square face of a cube onto paper. What shape did you draw?",
      choices: ["Cuboid", "Sphere", "Square"],
      answer: 2,
      hints: ["Look at just the outline on the paper.", "The outline has four equal sides and four square corners."],
      explanation: "One face of a cube is a flat square. The whole cube is solid.",
      transfer: "Trace a face of an ordinary carton. Compare it with your square.",
    },
  ],
  foundation: [
    {
      prompt: "You have four oranges. A friend gives you two more. How many do you have?",
      choices: ["6", "4", "7"],
      answer: 0,
      hints: ["Use four counters for the oranges you already have.", "Count on twice from four. Say one number for each extra orange."],
      explanation: "Start at four, then count five and six. Four plus two is six.",
      transfer: "Build two different groups of blocks that also add up to six.",
    },
    {
      prompt: "There are five books on a shelf. You put three more on it. How many books are there?",
      choices: ["9", "8", "7"],
      answer: 1,
      hints: ["Five books are already on the shelf.", "Say the next three numbers after five. Stop on the third one."],
      explanation: "Count six, seven and eight as you add the three books.",
      transfer: "Make up a story where you add three objects to a different starting number.",
    },
  ],
  exploration: [
    {
      prompt: "An empty sealed bottle floats. What could explain it?",
      choices: ["Water always pushes plastic out", "The colour of the bottle", "The air lowers its average density"],
      answer: 2,
      hints: ["Think about what is inside the bottle.", "Compare the mass of the sealed bottle with the mass of the same volume of water."],
      explanation: "The bottle and the air inside it together have a lower average density than water.",
      transfer: "Predict what happens if water enters the bottle. Describe one way to investigate.",
    },
    {
      prompt: "Which comparison best tests whether filling a bottle with water affects floating?",
      choices: ["Use two matching bottles, one empty and one filled", "Use two different objects in different liquids", "Use one bottle and record its colour"],
      answer: 0,
      hints: ["Aim to change only whether the bottle is empty or filled.", "Use matching containers in the same tank."],
      explanation: "Matching bottles in the same tank make their contents the main difference.",
      transfer: "Plan a test at three different fill levels. Explain what you would record.",
    },
  ],
  mastery: [
    {
      prompt: "A class says shade lowers soil temperature. Which additional information matters most when checking their evidence?",
      choices: ["The name of the school", "Whether the paired readings used the same depth", "How popular the report was"],
      answer: 1,
      hints: ["Think about conditions that could change a soil temperature reading.", "Would a shallow reading and a deep reading give a fair comparison?"],
      explanation: "Keeping measurement depth the same helps isolate the effect of shade.",
      transfer: "Describe another condition to control. Explain how changing it might affect the result.",
    },
    {
      prompt: "Two trials support a claim about shade and one trial does not. What should the class report?",
      choices: ["Only the two results that support the claim", "The claim as a fact because two trials agree", "All three results and possible reasons for the difference"],
      answer: 2,
      hints: ["Consider what a reader needs to judge the strength of the evidence.", "Leaving out a different result would hide uncertainty."],
      explanation: "Reporting all trials lets readers see the variation and decide how much confidence to place in the claim.",
      transfer: "Propose one more trial that could help explain the different result.",
    },
  ],
};

export function worldCheck(world: WorldId, nextVariant: number): WorldCheck {
  return checks[world][nextVariant % checks[world].length] ?? checks[world][0];
}
