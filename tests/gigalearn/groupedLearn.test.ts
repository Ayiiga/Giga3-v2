/** @vitest-environment happy-dom */

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { act, createElement } from "../../web/node_modules/react";
import { createRoot, type Root } from "../../web/node_modules/react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { GroupedTemplate } from "../../web/components/learn/GroupedTemplate";
import {
  LEARN_ANIMALS,
  LEARN_BODY,
  LEARN_FRUITS,
  LEARN_PAGE_SIZE,
  LEARN_VEGETABLES,
  pageOf,
} from "../../convex/learnContent";
import { CONCRETE_CATEGORIES, CONCRETE_QUIZZES } from "../../web/lib/gigalearn/concreteObjects";

describe("grouped learn library", () => {
  it("keeps the expanded animal, body, fruit, and vegetable lists without duplicates", () => {
    expect(LEARN_ANIMALS.map((item) => item.title)).toEqual([
      "Dog", "Cat", "Chicken", "Goat", "Sheep", "Cow", "Pig", "Duck", "Rabbit", "Fish",
      "Bird", "Monkey", "Elephant", "Lion", "Turtle", "Snake", "Frog", "Horse", "Donkey", "Parrot",
    ]);
    expect(LEARN_BODY.map((item) => item.title)).toEqual([
      "Hands", "Eyes", "Nose", "Mouth", "Ears", "Head", "Legs", "Feet", "Teeth", "Hair", "Fingers", "Stomach",
    ]);
    expect(LEARN_FRUITS.map((item) => item.id)).toEqual(
      expect.arrayContaining(["apple", "banana", "orange", "mango", "pawpaw"])
    );
    expect(LEARN_VEGETABLES.map((item) => item.id)).toEqual(
      expect.arrayContaining(["carrot", "potato", "tomato"])
    );
    for (const list of [LEARN_ANIMALS, LEARN_BODY, LEARN_FRUITS, LEARN_VEGETABLES]) {
      expect(new Set(list.map((item) => item.id)).size).toBe(list.length);
    }
    expect(CONCRETE_CATEGORIES.find((cat) => cat.id === "shapes")?.items.length).toBeGreaterThan(0);
    expect(CONCRETE_QUIZZES.length).toBeGreaterThan(0);
  });

  it("pages animals six at a time and stops at the ends", () => {
    const first = pageOf(LEARN_ANIMALS, 1, LEARN_PAGE_SIZE);
    const next = pageOf(LEARN_ANIMALS, 2, LEARN_PAGE_SIZE);
    const last = pageOf(LEARN_ANIMALS, 99, LEARN_PAGE_SIZE);
    const back = pageOf(LEARN_ANIMALS, 0, LEARN_PAGE_SIZE);
    expect(first.items).toHaveLength(6);
    expect(first.items.map((item) => item.title)).toEqual(["Dog", "Cat", "Chicken", "Goat", "Sheep", "Cow"]);
    expect(next.items[0]?.title).toBe("Pig");
    expect(last.page).toBe(4);
    expect(last.items.map((item) => item.title)).toEqual(["Donkey", "Parrot"]);
    expect(back.page).toBe(1);
    const seen = [1, 2, 3, 4].flatMap((page) => pageOf(LEARN_ANIMALS, page).items.map((item) => item.id));
    expect(seen).toEqual(LEARN_ANIMALS.map((item) => item.id));
  });
});

describe("GroupedTemplate controls", () => {
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  it("disables Back on the first page and moves to the next page", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root?.render(
        createElement(GroupedTemplate, {
          title: "Animals",
          badge: "Concrete",
          items: LEARN_ANIMALS,
          hearingId: null,
          onHear: () => undefined,
        })
      );
    });
    expect(host.textContent).toContain("Dog");
    expect(host.textContent).not.toContain("Parrot");
    const buttons = [...host.querySelectorAll("button")];
    const back = buttons.find((button) => button.textContent?.includes("Back"));
    const next = buttons.find((button) => button.textContent?.includes("Next"));
    const hear = buttons.find((button) => button.getAttribute("aria-label") === "Pronounce Dog. English first.");
    expect(back?.hasAttribute("disabled")).toBe(true);
    expect(next?.hasAttribute("disabled")).toBe(false);
    expect(hear).toBeTruthy();
    act(() => {
      next?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(host.textContent).toContain("Pig");
    expect(host.textContent).toContain("Page 2 of 4");
  });
});
