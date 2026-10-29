import { test, expect, type Page } from "@playwright/test";

async function start(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "PLAY QUICK MATCH" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Get to zero. Take the tile." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "TAKE THE FIELD" }).click();
  await expect(page.locator("#turn-text")).toHaveText("YOUR TURN");
}

test("title, first-play manual, sound preferences, touch controls and mobile layout", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await expect(page.locator("#board .tile")).toHaveCount(36);
  const legal = page.locator("#board .legal");
  expect(await legal.count()).toBeGreaterThanOrEqual(2);
  const cell = await legal.first().boundingBox();
  expect(cell!.width).toBeGreaterThanOrEqual(44);
  if (isMobile) await legal.first().tap();
  else await legal.first().click();
  await expect(page.locator("#turn-text")).toHaveText("CPU IS THINKING");
  await expect(page.locator("#hold")).toBeDisabled();
  await expect(page.locator("#turn-text")).toHaveText("YOUR TURN");
  await expect(page.locator("#core .core-number")).toHaveText("1");
  await page.getByRole("button", { name: "Turn sound off" }).click();
  await expect(
    page.getByRole("button", { name: "Turn sound on" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Pause match" }).click();
  await expect(
    page.getByRole("heading", { name: "Field paused." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "HOW TO PLAY", exact: true }).click();
  await page.getByRole("button", { name: "BACK TO MATCH" }).click();
  await expect(page.locator("#hold")).toBeEnabled();
  const viewport = page.viewportSize()!;
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(viewport.width);
  if (viewport.width < 500 && viewport.height >= 800) {
    const hold = await page.locator("#hold").boundingBox();
    expect(hold!.y + hold!.height).toBeLessThan(viewport.height);
  }
  await page.locator("#hold").scrollIntoViewIfNeeded();
  await expect(page.locator("#hold")).toBeInViewport();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Turn sound on" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "PLAY QUICK MATCH" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("rewind charges, pause freezes CPU, restart resets field and title requires deliberate exit", async ({
  page,
}) => {
  await page.clock.install();
  await start(page);
  await page.locator("#rewind").click();
  await expect(page.locator("#core .core-number")).toHaveText("4");
  await expect(page.locator("#your-charges")).toHaveAttribute(
    "aria-label",
    "1 rewinds remaining",
  );
  await page.getByRole("button", { name: "Pause match" }).click();
  const score = await page.locator("#your-score").textContent();
  await page.clock.runFor(10000);
  await expect(page.locator("#your-score")).toHaveText(score!);
  await page.getByRole("button", { name: "RESUME MATCH" }).click();
  await page.clock.runFor(600);
  await expect(page.locator("#turn-text")).toHaveText("YOUR TURN");
  await page.locator("#rewind").click();
  await expect(page.locator("#your-charges")).toHaveAttribute(
    "aria-label",
    "0 rewinds remaining",
  );
  await page.clock.runFor(600);
  await expect(page.locator("#rewind")).toBeDisabled();
  await page.getByRole("button", { name: "Pause match" }).click();
  await page.getByRole("button", { name: "RESTART MATCH ↶" }).click();
  await expect(
    page.getByRole("heading", { name: "Start over?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "RESTART MATCH", exact: false })
    .click();
  await expect(page.locator("#your-charges")).toHaveAttribute(
    "aria-label",
    "2 rewinds remaining",
  );
  await expect(page.locator("#your-score")).toHaveText("00");
  await expect(page.locator("#cpu-score")).toHaveText("00");
  await page
    .getByRole("button", { name: "BlackHouse Games — title screen" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Abandon field?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "KEEP PLAYING" }).click();
  await expect(page.locator("#hold")).toBeEnabled();
});

test("plays a complete match, shows a definitive result, records once, persists statistics and replays", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install();
  await start(page);
  let moves = 0;
  for (let step = 0; step < 100; step++) {
    const dialogVisible = await page.getByRole("dialog").isVisible();
    if (dialogVisible) break;
    if (await page.locator("#hold").isEnabled()) {
      const legal = page.locator("#board .legal");
      if (moves % 3 === 0 && (await legal.count())) await legal.first().click();
      else await page.locator("#hold").click();
      moves++;
    }
    await page.clock.runFor(1000);
  }
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#modal-title")).toHaveText(
    /FIELD(SECURED|LOST)\./,
  );
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("blackhouse.zero-claim.v1")!),
  );
  expect(record.played).toBe(1);
  expect(record.wins + record.losses).toBe(1);
  await page.getByRole("button", { name: "PLAY AGAIN" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("#your-score")).toHaveText("00");
  await expect(page.locator("#core .core-number")).toHaveText("3");
  await page.reload();
  await expect(page.locator(".record-line")).toContainText(
    `${String(record.wins).padStart(2, "0")} WINS`,
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("blackhouse.zero-claim.v1")!).played,
    ),
  ).toBe(1);
  expect(errors).toEqual([]);
});

test("small portrait and landscape screens remain usable without horizontal overflow", async ({
  page,
}) => {
  await start(page);
  for (const size of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(size.width);
    await page.locator("#hold").scrollIntoViewIfNeeded();
    await expect(page.locator("#hold")).toBeInViewport();
    const board = await page.locator("#board").boundingBox();
    expect(Math.abs(board!.width - board!.height)).toBeLessThan(2);
  }
});

test("keyboard actions respect CPU lockout and Escape resumes paused turns", async ({
  page,
}) => {
  await page.clock.install();
  await start(page);
  await page.keyboard.press("h");
  await expect(page.locator("#core .core-number")).toHaveText("2");
  await page.keyboard.press("r");
  await expect(page.locator("#your-charges")).toHaveAttribute(
    "aria-label",
    "2 rewinds remaining",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.clock.runFor(2000);
  await expect(page.locator("#core .core-number")).toHaveText("2");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.clock.runFor(600);
  await expect(page.locator("#core .core-number")).toHaveText("1");
  await page.keyboard.press("r");
  await expect(page.locator("#core .core-number")).toHaveText("4");
  await expect(page.locator("#your-charges")).toHaveAttribute(
    "aria-label",
    "1 rewinds remaining",
  );
});
