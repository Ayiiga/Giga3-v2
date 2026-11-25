import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("Learn exposes each school band, the university pathway and searchable tools", async ({ page }) => {
  await page.goto("/gigalearn/");
  const home = page.locator(".learning-home");
  for (const [name, levels] of [["Early Years", 2], ["Basic 1–6", 6], ["JHS", 3], ["SHS", 3]] as const) {
    await home.getByRole("button", { name, exact: true }).click();
    await expect(home.locator('a[href*="tab=learn"],a[href*="tab=early-years"]')).toHaveCount(levels);
  }
  await home.getByRole("button", { name: "University" }).click();
  await expect(home.getByRole("link", { name: /University study/ })).toBeVisible();
  await home.getByRole("searchbox").fill("worksheets");
  await expect(home.getByRole("link", { name: /Teaching materials/ })).toBeVisible();
  await expect(home.locator(".learning-tools a")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Learn exposes working starter activities in all four worlds", async ({ page }) => {
  await page.goto("/gigalearn/");
  await page.getByRole("link", { name: /Discovery World/ }).click();
  await page.getByText("Caregiver and KG activities", { exact: true }).click();
  const caregiver = page.getByRole("button", { name: "Crèche caregiver activity" });
  await caregiver.click();
  await expect(caregiver).toHaveAttribute("aria-pressed", "true");
  await expect(caregiver).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.getByRole("heading", { name: "Roll and take turns" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sphere" })).toHaveCount(0);
  await page.getByRole("button", { name: "KG shape activity" }).click();
  const shapes = page.getByRole("region", { name: "Flat and solid shapes" });
  await shapes.getByRole("button", { name: "Sphere", exact: true }).click();
  await expect(shapes.getByRole("status")).toContainText("Correct");

  await page.getByRole("link", { name: "Back to Learn" }).click();
  await page.getByRole("link", { name: /Foundation World/ }).click();
  const subjects = page.getByRole("group", { name: "Foundation subjects" });
  const math = subjects.getByRole("button", { name: "Mathematics" });
  const readingTab = subjects.getByRole("button", { name: "Reading" });
  await expect(math).toHaveAttribute("aria-pressed", "true");
  await expect(math).not.toHaveCSS("background-image", "none");
  await page.getByRole("button", { name: "Add a counter" }).click();
  await page.getByRole("button", { name: "Add a counter" }).click();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Count on from three" })).toBeVisible();
  await readingTab.click();
  await expect(readingTab).toHaveAttribute("aria-pressed", "true");
  await expect(math).toHaveAttribute("aria-pressed", "false");
  const reading = page.getByRole("region", { name: "Mansa and the mangoes" });
  await reading.getByRole("button", { name: "To share them with her brother" }).click();
  await expect(reading.getByRole("status")).toContainText("The second sentence");
  await page.getByRole("button", { name: "Mathematics", exact: true }).click();
  const review = page.getByRole("region", { name: "Practice and review" });
  await expect(review.getByRole("button", { name: "Check answer" })).toBeDisabled();
  await review.getByRole("button", { name: "Show a hint" }).click();
  await expect(review.getByText("Use four counters", { exact: false })).toBeVisible();
  await review.getByRole("button", { name: "6", exact: true }).click();
  await review.getByRole("button", { name: "Check answer" }).click();
  await expect(review.getByText("Four plus two is six", { exact: false })).toBeVisible();
  await review.getByRole("button", { name: "Try another example" }).click();
  await expect(review.getByText("There are five books", { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "Back to Learn" }).click();
  await page.getByRole("link", { name: /Exploration World/ }).click();
  const model = page.getByRole("region", { name: "Sink or float simulation" });
  await expect(model.getByRole("button", { name: "Test in the model" })).toBeDisabled();
  await model.getByRole("button", { name: "Dense solid stone" }).click();
  await model.getByRole("button", { name: "Sinks", exact: true }).click();
  await model.getByRole("button", { name: "Test in the model" }).click();
  await expect(model.locator(".gigalearn-tank-piece")).toHaveAttribute("data-position", "sinks");
  await expect(model.locator(".gigalearn-tank-piece")).toHaveCSS("animation-name", "gigalearn-drop");
  await model.getByText(/Model observations ·/).click();
  await expect(model.getByRole("table")).toContainText("Dense solid stone");
  await expect(model.getByRole("status")).toContainText("denser than water");

  await page.getByRole("link", { name: "Back to Learn" }).click();
  await page.getByRole("link", { name: /Mastery World/ }).click();
  await page.getByRole("button", { name: /paired shaded and unshaded plots/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "compare the conditions directly" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open BECE practice" })).toHaveAttribute("href", "/gigalearn/exam/bece/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Learn exposes fruit play, audio tracks and lab awards", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/gigalearn/?world=discovery");
  const lesson = page.getByRole("region", { name: "Look and say" });
  const photo = lesson.locator("img");
  const zoom = lesson.getByRole("button", { name: "Zoom picture" });
  await expect(photo).toHaveAttribute("alt", "Object to guess");
  await expect(photo).toHaveJSProperty("complete", true);
  expect((await photo.boundingBox())!.width).toBeGreaterThan(240);
  await zoom.tap();
  await expect(lesson.getByRole("button", { name: "Zoom out" })).toHaveAttribute("aria-pressed", "true");
  expect((await photo.boundingBox())!.width).toBeGreaterThan(320);

  const heardMango = page.waitForResponse(/activities\/discovery\/mango\.mp3/);
  await lesson.getByRole("button", { name: "Hear name" }).tap();
  expect((await heardMango).ok()).toBe(true);
  await expect(photo).toHaveAttribute("alt", "Mango");
  await lesson.getByRole("button", { name: "Next picture" }).tap();
  await expect(photo).toHaveAttribute("alt", "Object to guess");
  await lesson.getByRole("button", { name: "Home and school" }).tap();
  const heardBall = page.waitForResponse(/activities\/discovery\/ball\.mp3/);
  await lesson.getByRole("button", { name: "Hear name" }).tap();
  expect((await heardBall).ok()).toBe(true);
  await expect(photo).toHaveAttribute("alt", "Ball");
  for (const [category, firstPicture, count] of [
    ["Domestic animals", "Dog", 20],
    ["Wildlife", "Lion", 20],
    ["Body parts", "Eye", 10],
  ] as const) {
    await lesson.getByRole("button", { name: category }).tap();
    await expect(lesson.locator('[aria-label="Picture progress"]')).toHaveText(`1 / ${count}`);
    await expect(photo).toHaveAttribute("alt", "Object to guess");
    await lesson.getByRole("button", { name: "Hear name" }).tap();
    await expect(photo).toHaveAttribute("alt", firstPicture);
    await expect(photo).toHaveJSProperty("complete", true);
    expect(await photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
  await lesson.getByRole("button", { name: "Fruits" }).tap();
  await lesson.getByRole("button", { name: "Hear name" }).tap();
  await lesson.getByRole("button", { name: "Play Fruit Finder" }).tap();

  const game = page.getByRole("region", { name: "Fruit Finder", exact: true });
  await expect(game.locator("img").filter({ visible: true })).toHaveCount(2);
  const heardPrompt = page.waitForResponse(/activities\/discovery\/find-orange\.mp3/);
  await game.getByRole("button", { name: "Find the orange", exact: true }).tap();
  expect((await heardPrompt).ok()).toBe(true);
  await game.getByRole("button", { name: "Pineapple", exact: true }).tap();
  await expect(game.getByText("Try the other picture.")).toBeVisible();
  await expect(game.getByRole("button", { name: "Find the next fruit" })).toBeDisabled();
  const baskets = [
    ["Orange", "Banana", "Mango", "Pawpaw", "Pineapple"],
    ["Coconut", "Apple", "Plantain", "Watermelon", "Guava"],
    ["Avocado", "Lemon", "Lime", "Grapes", "Strawberry"],
    ["Pear", "Plum", "Dates", "Peach", "Passion fruit"],
  ];
  for (const [basketIndex, fruits] of baskets.entries()) {
    await expect(game.getByText(`Basket ${basketIndex + 1} of 4 · Fruit 1 of 5`)).toBeVisible();
    for (const [index, fruit] of fruits.entries()) {
      const choice = game.getByRole("button", { name: fruit, exact: true });
      const picture = choice.locator("img");
      await choice.tap();
      await expect(picture).toHaveJSProperty("complete", true);
      expect(await picture.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      await expect(game.getByText(`Well spotted! ${fruit}.`)).toBeVisible();
      await game.getByRole("button", { name: index === fruits.length - 1 ? "See my award" : "Find the next fruit" }).tap();
    }
    if (basketIndex < baskets.length - 1) {
      await expect(game.getByText("Basket award")).toBeVisible();
      await game.getByRole("button", { name: "Next basket" }).tap();
    }
  }
  await expect(game.getByText("Fruit Finder award")).toBeVisible();
  await expect(game.getByText("You matched all 20 fruits!")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Songs and rhymes" }).tap();
  const music = page.getByRole("region", { name: "Songs and rhymes" });
  const audio = music.locator("audio");
  const song = await audio.getAttribute("src");
  expect(song).toContain("count-and-clap.mp3");
  expect((await page.request.get(song!)).ok()).toBe(true);
  await music.getByRole("button", { name: "Mango Sweet" }).tap();
  const rhyme = await audio.getAttribute("src");
  expect(rhyme).toContain("rhyme-mango-en.mp3");
  expect((await page.request.get(rhyme!)).ok()).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gigalearn/?world=exploration");
  const model = page.getByRole("region", { name: "Sink or float simulation" });
  for (const [name, position] of [["Dry wooden block", "floats"], ["Dense solid stone", "sinks"], ["Sealed empty plastic bottle", "floats"]]) {
    await model.getByRole("button", { name }).tap();
    await model.getByRole("button", { name: "Sinks", exact: true }).tap();
    await model.getByRole("button", { name: "Test in the model" }).tap();
    await expect(model.locator(".gigalearn-tank-piece")).toHaveAttribute("data-position", position);
    await expect(model.locator(".gigalearn-tank-piece")).toHaveCSS("animation-name", "none");
  }
  await expect(model.getByText("Water Investigator award")).toBeVisible();
  await expect(model.getByText(/Model observations · 3 of 3/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test.describe("Discovery service worker", () => {
  test.use({ serviceWorkers: "allow" });

  test("Learn exposes offline replay for a previously loaded Discovery sound", async ({ page }) => {
    await page.goto("/gigalearn/?world=discovery", { waitUntil: "domcontentloaded" });
    // Install the released worker explicitly so this test isolates its audio
    // behavior. The production service-worker suite checks app registration.
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    });
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state), {
      timeout: 15_000,
      message: "The Discovery page should be controlled by the released service worker",
    }).toBe("activated");
    const clip = "/gigalearn/activities/discovery/mango.mp3";
    async function readSample() {
      return page.evaluate(async (path) => {
        const response = await fetch(path, { headers: { Range: "bytes=0-511" } });
        return {
          status: response.status,
          range: response.headers.get("Content-Range"),
          bytes: Array.from(new Uint8Array(await response.arrayBuffer())),
        };
      }, clip);
    }
    const online = await readSample();
    expect(online.status).toBe(206);
    expect(online.range).toMatch(/^bytes 0-511\/\d+$/);
    expect(online.bytes).toHaveLength(512);
    await page.context().setOffline(true);
    try {
      expect(await readSample()).toEqual(online);
    } finally {
      await page.context().setOffline(false);
    }
  });
});

test("Discover keeps the keyboard target while filters and results update", async ({ page }) => {
  await page.goto("/gigasocial/?tab=discover");
  const input = page.getByRole("textbox", { name: "Search posts", exact: true });
  await input.fill("science");
  // Wait beyond the search debounce so this also covers the query's loading state.
  await expect.poll(() => input.evaluate(node => document.activeElement === node), {
    intervals: [350],
  }).toBe(true);
  await input.pressSequentially(" lesson", { delay: 80 });
  await expect(input).toHaveValue("science lesson");
  await expect(input).toBeFocused();
  const filter = page.getByRole("button", { name: "Education", exact: true }).last();
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await expect(input).toHaveValue("science lesson");
});

test("Social media stage loops photos and keeps manual controls on screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", { get: () => false });
    const now = Date.now();
    localStorage.setItem("gigasocial-feed-offline-snapshot-v1", JSON.stringify({
      savedAt: now, posts: [{
        _id: "local-gallery", body: "Science field notes", mediaType: "gallery", postType: "image",
        mediaUrls: ["/images/interface/course.webp", "/images/interface/jhs.webp"], createdAt: now,
        author: { displayName: "Science Club", handle: "scienceclub" }, likeCount: 2, commentCount: 0, shareCount: 0,
      }],
    }));
  });
  await page.goto("/gigasocial/", { waitUntil: "domcontentloaded" });
  const card = page.locator("#gigasocial-feed-posts article").first();
  await card.locator(".gigasocial-post-card__media-region").evaluate(el => el.scrollIntoView({ block: "start" }));
  const controls = card.getByRole("group", { name: "Photo controls" });
  await expect(controls.getByRole("button", { name: "Pause slideshow" })).toBeVisible();
  await expect(controls).toContainText("2 / 2", { timeout: 8500 });
  await controls.getByRole("button", { name: "Pause slideshow" }).click();
  await controls.getByRole("button", { name: "Next photo" }).click();
  await expect(controls).toContainText("1 / 2");
  const frame = card.locator(".gigasocial-feed-media--gallery").first();
  await frame.evaluate(target => {
    const touch = (clientX: number) => new Touch({ identifier: 1, target, clientX, clientY: 120 });
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(160)] }));
    target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [touch(65)] }));
  });
  await expect(controls).toContainText("2 / 2");
  await expect(card.getByRole("button", { name: "Save post", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Feed navigation" }).getByText("Create")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
