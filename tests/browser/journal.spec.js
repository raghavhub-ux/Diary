import { test, expect } from "@playwright/test";
test("sample journal supports writing, reopening, navigation and mobile layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /Explore sample/ }).click();
  await page.getByRole("link", { name: "Write an entry" }).click();
  await page.getByLabel("Entry title").fill("A small win");
  await page
    .getByRole("textbox", { name: "Journal content" })
    .fill("आज I finished my project.");
  await page.getByRole("button", { name: "Save entry" }).click();
  await page.getByRole("link", { name: /A small win/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Journal content" }),
  ).toContainText("finished my project");
  for (const label of [
    "Calendar",
    "Mood tracker",
    "Habit tracker",
    "My growth",
    "Weekly reviews",
    "Insights",
    "Settings",
  ]) {
    await page
      .locator("aside")
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.locator("aside").getByRole("link", { name: "Dashboard" }).click();
  await expect(
    page.getByRole("link", { name: "Write an entry" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
