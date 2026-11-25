export const MATH_STAGES = [
  { id: "numbers", label: "Counting and place value", title: "Number Explorer", tone: "blue", requires: null },
  { id: "multiply-one", label: "One-digit multiplication", title: "Multiplication Starter", tone: "green", requires: "numbers" },
  { id: "multiply-two", label: "Two-digit multiplication", title: "Place Value Multiplier", tone: "green", requires: "multiply-one" },
  { id: "multiply-three", label: "Three-digit multiplication", title: "Brilliant Multiplier", tone: "green", requires: "multiply-two" },
  { id: "add", label: "Addition", title: "Addition Builder", tone: "gold", requires: "numbers" },
  { id: "subtract", label: "Subtraction", title: "Subtraction Explorer", tone: "pink", requires: "numbers" },
  { id: "divide", label: "Division", title: "Fair Share Mathematician", tone: "violet", requires: "numbers" },
] as const;

export type MathStage = (typeof MATH_STAGES)[number];
export type MathStageId = MathStage["id"];

type Question = {
  prompt: string;
  answer: number;
  options: number[];
  hint: string;
  explanation: string;
  model?: { rows: number; columns: number };
};

function question(
  prompt: string,
  answer: number,
  distractors: number[],
  order: number,
  hint: string,
  explanation: string,
  model?: Question["model"]
): Question {
  const options = [...new Set([answer, ...distractors, answer + 1, answer + 2, answer + 3])]
    .filter((value) => value >= 0).slice(0, 4);
  const shift = order % options.length;
  return { prompt, answer, options: [...options.slice(shift), ...options.slice(0, shift)], hint, explanation, model };
}

function placeParts(value: number): number[] {
  return [Math.floor(value / 100) * 100, Math.floor(value / 10) % 10 * 10, value % 10]
    .filter(Boolean);
}

function numbers(attempt: number): Question[] {
  const count = 4 + attempt % 5;
  const position = 28 + attempt % 17;
  const hundreds = 2 + attempt % 6;
  const tens = 1 + (attempt + 2) % 8;
  const ones = 1 + (attempt + 4) % 8;
  const value = hundreds * 100 + tens * 10 + ones;
  const smaller = 102 + attempt % 23;
  return [
    question("How many counters are on the mat?", count, [count - 1, count + 2, count + 3], attempt + 2,
      "Point to each counter once as you count.", `There are ${count} counters.`, { rows: 1, columns: count }),
    question(`Which number comes next after ${position}?`, position + 1, [position, position + 2, position - 1], attempt + 3,
      "Count forward one number.", `One more than ${position} is ${position + 1}.`),
    question(`What is the value of the tens digit in ${value}?`, tens * 10, [hundreds * 100, tens, ones], attempt + 1,
      "The tens digit is immediately to the left of the ones digit.", `The digit ${tens} represents ${tens * 10}.`),
    question(`Which number is ${placeParts(value).join(" + ")}?`, value, [value + 10, value - 1, value - 10], attempt,
      "Put hundreds, tens and ones into their correct positions.", `${placeParts(value).join(" + ")} = ${value}.`),
    question("Which is the greatest number?", smaller + 20, [smaller, smaller - 10, smaller + 10], attempt + 2,
      "Compare hundreds, then tens, then ones.", `${smaller + 20} is the greatest number in this set.`),
  ];
}

const multiplicationPairs: Record<"multiply-one" | "multiply-two" | "multiply-three", number[][]> = {
  "multiply-one": [[2, 3], [3, 4], [5, 2], [4, 6], [7, 3]],
  "multiply-two": [[12, 3], [24, 4], [36, 5], [13, 12], [26, 14]],
  "multiply-three": [[112, 3], [234, 4], [126, 12], [213, 14], [103, 112]],
};

function multiply(a: number, b: number, order: number): Question {
  const answer = a * b;
  const small = a < 10 && b < 10;
  const whole = b >= 10 ? a : b;
  const parts = placeParts(b >= 10 ? b : a);
  const expansion = parts.map((part) => `${whole} × ${part}`).join(" + ");
  return question(
    small ? `How many in ${a} groups of ${b}? ${a} × ${b} = ?` : `${a} × ${b} = ?`,
    answer, [answer - b, answer + b, a + b], order,
    small ? `Count by ${b}s for ${a} equal groups.` : "Split one factor by place value, multiply each part, then add the partial products.",
    small ? `Count ${a} groups of ${b} to get ${answer}. ${answer} is a multiple of ${b}.` : `${a} × ${b} = ${expansion} = ${answer}.`,
    small ? { rows: a, columns: b } : undefined,
  );
}

export function foundationMathQuestions(stage: MathStageId, attempt: number): Question[] {
  if (stage === "numbers") return numbers(attempt);
  if (stage === "multiply-one" || stage === "multiply-two" || stage === "multiply-three") {
    return multiplicationPairs[stage].map(([a, b], index) =>
      multiply(a + attempt % 3, b + (index + attempt) % 2, attempt + index));
  }

  return [0, 1, 2, 3, 4].map((index) => {
    const offset = attempt % 4;
    const divisor = 2 + index + offset;
    const quotient = [3, 5, 12, 18, 24][index] + offset;
    const a = [8, 17, 38, 137, 228][index] + offset;
    const b = [6, 7, 24, 46, 157][index] + offset;
    const order = attempt + index;
    if (stage === "add") {
      return question(`${a} + ${b} = ?`, a + b, [a + b - 10, a + b + 10, a + b - 1], order,
        "Add ones to ones, tens to tens and hundreds to hundreds. Regroup where needed.",
        `${a} + ${b} = ${a + b}. Check by starting with ${a} and counting on ${b}.`);
    }
    if (stage === "subtract") {
      return question(`${a} − ${b} = ?`, a - b, [a - b - 1, a - b + 10, a + b], order,
        "Start with the larger number and take away the smaller number. Regroup if needed.",
        `${a} − ${b} = ${a - b}. Check with addition: ${a - b} + ${b} = ${a}.`);
    }
    return question(`${quotient * divisor} ÷ ${divisor} = ?`, quotient, [quotient - 1, quotient + 2, quotient + 3], order,
      `Share equally between ${divisor} groups or use a related multiplication fact.`,
      `${quotient} × ${divisor} = ${quotient * divisor}, so each group gets ${quotient}.`);
  });
}

export function mathStageUnlocked(stage: MathStage, completed: readonly MathStageId[]): boolean {
  return stage.requires === null || completed.includes(stage.requires);
}

export function validMathProgress(stored: unknown): MathStageId[] {
  if (!Array.isArray(stored)) return [];
  const completed: MathStageId[] = [];
  for (const stage of MATH_STAGES) {
    if (stored.includes(stage.id) && mathStageUnlocked(stage, completed)) completed.push(stage.id);
  }
  return completed;
}
