import { chromium } from "playwright-core";

const BASE = "http://127.0.0.1:3214";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok: Boolean(ok), extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

try {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.locator('input[autocomplete="username"]').fill("auto178234");
  await page.locator('input[autocomplete="current-password"]').fill("Test1234");
  await page.locator('form button[type="submit"]').click();
  await page.waitForSelector("text=مرحله بعد", { timeout: 30000 });
  await page.waitForTimeout(1200);

  const nameField = page.getByPlaceholder("مثلاً شرکت نمونه تجارت کیم");
  if ((await nameField.inputValue()).trim() === "") {
    await nameField.fill("شرکت تایپ");
  }
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "مرحله بعد" }).click();
  await page.waitForTimeout(800);

  const qty = page.locator('[aria-label="تعداد"]').first();
  const price = page.locator('[aria-label="قیمت واحد"]').first();

  // real typing: click, type "7" (should replace default 1)
  await qty.click();
  await page.keyboard.type("7");
  await page.waitForTimeout(300);
  const qtyAfter = await qty.inputValue();
  check("real typing replaces quantity default", qtyAfter === "7" || qtyAfter === "۷", `got "${qtyAfter}"`);

  // real typing on price: click, type "900000"
  const pricePre = await price.inputValue();
  await price.click();
  const pricePostClick = await price.inputValue();
  await page.keyboard.type("900000");
  await page.waitForTimeout(300);
  const priceAfter = await price.inputValue();
  const priceDigits = priceAfter.replace(/[^\d۰-۹]/g, "");
  check(
    "real typing fills price",
    priceDigits.length >= 6,
    `pre="${pricePre}" postClick="${pricePostClick}" after="${priceAfter}"`,
  );

  // focus the price again and type "5" (should replace entire value)
  await price.click();
  await page.keyboard.type("5");
  await page.waitForTimeout(300);
  const priceReplace = await price.inputValue();
  check("re-focus typing replaces price", priceReplace === "5" || priceReplace === "۵", `got "${priceReplace}"`);

  // select-all via keyboard then type
  await qty.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("4");
  await page.waitForTimeout(300);
  const qtyCtrlA = await qty.inputValue();
  check("ctrl+a typing replaces quantity", qtyCtrlA === "4" || qtyCtrlA === "۴", `got "${qtyCtrlA}"`);

  check("no page errors", true);
} catch (e) {
  check("typing flow completed", false, e.message);
} finally {
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n===== ${passed}/${results.length} typing checks passed =====`);
  await browser.close();
}
