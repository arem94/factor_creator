import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:3214";
const OUT = "C:\\Users\\Amir\\AppData\\Local\\Temp\\herness-e2e";
fs.mkdirSync(OUT, { recursive: true });

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const faToLatin = (s) => s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));

const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok: Boolean(ok), extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  acceptDownloads: true,
  locale: "fa-IR",
  timezoneId: "Asia/Tehran",
});

const page = await context.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message));

const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
};

const mobile = "0912" + String(Date.now()).slice(-7);
const username = "auto" + String(Date.now()).slice(-6);
const password = "Test1234";

try {
  /* ------------------------- ۱) صفحه ورود ------------------------- */
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  check("login page renders", await page.locator("h1", { hasText: "ورود به حساب" }).isVisible());
  await shot("01-login-light.png");

  /* ------------------------- ۲) تغییر تم ------------------------- */
  await page.locator('[data-theme-option="dark"]').click();
  await page.waitForTimeout(400);
  check(
    "dark theme applies",
    await page.evaluate(() => document.documentElement.classList.contains("dark")),
  );
  await shot("02-login-dark.png");
  await page.locator('[data-theme-option="light"]').click();
  await page.waitForTimeout(300);

  /* ------------------------- ۳) ثبت‌نام ------------------------- */
  await page.getByRole("button", { name: "ثبت‌نام", exact: true }).click();
  await page.getByPlaceholder("مثلاً امیر محمدی").fill("آزمون خودکار");
  await page.getByPlaceholder("۰۹۱۲۱۲۳۴۵۶۷").fill(mobile);
  await page.getByRole("button", { name: "ارسال کد تأیید" }).click();

  await page.waitForSelector("text=کد آزمایشی", { timeout: 20000 });
  await page.waitForTimeout(600);
  const verifyText = await page.locator("body").innerText();
  const codeMatch = verifyText.match(/کد آزمایشی[^:]*:\s*([۰-۹]+)/);
  const code = codeMatch ? faToLatin(codeMatch[1]) : null;
  check("OTP dev code received", Boolean(code), code ?? "not found");

  await page.getByPlaceholder("- - - - -").fill(code);
  await page.getByPlaceholder("amir").fill(username);
  await page.getByPlaceholder("حداقل ۶ کاراکتر").fill(password);
  await shot("03-register-verify.png");
  await page.getByRole("button", { name: "تأیید و ساخت حساب" }).click();

  await page.waitForURL(BASE + "/", { timeout: 30000 });
  await page.waitForSelector("text=مرحله بعد", { timeout: 30000 });
  check("registration + redirect to editor", true, username + " / " + mobile);
  await page.waitForTimeout(1200);
  await shot("04-editor-step1.png");

  /* ------------------------- ۴) مرحله ۱: اطلاعات اولیه ------------------------- */
  await page.getByPlaceholder("مثلاً شرکت نمونه تجارت کیم").fill("شرکت آزمون خودکار");
  await page.getByPlaceholder("۰۲۱-۸۸۷۷۶۶۵۵").fill("۰۲۱-۱۲۳۴۵۶۷۸");
  await page.getByPlaceholder("استان، شهر، خیابان، پلاک، واحد").fill("تهران، خیابان آزادی، پلاک ۱۲");
  await page.getByPlaceholder("مثلاً فروشگاه زنجیره‌ای آرمان").fill("خریدار آزمون");
  const numberField = page.getByPlaceholder("۱۴۰۴-۰۱۲");
  await numberField.fill("۱۴۰۴-۹۹۹");
  check("company info filled", (await page.getByPlaceholder("مثلاً شرکت نمونه تجارت کیم").inputValue()) === "شرکت آزمون خودکار");

  await page.getByRole("button", { name: "مرحله بعد" }).click();
  await page.waitForTimeout(700);

  /* ------------------------- ۵) مرحله ۲: اقلام ------------------------- */
  await page.evaluate(() => {
    window.__qtyEvents = [];
    const el = document.querySelector('[aria-label="تعداد"]');
    if (el) {
      ["focus", "input", "change", "blur", "beforeinput"].forEach((t) =>
        el.addEventListener(
          t,
          (e) => window.__qtyEvents.push({ type: t, value: e && e.target ? e.target.value : el.value }),
          true,
        ),
      );
    }
  });
  const qtyLoc = page.locator('[aria-label="تعداد"]').first();
  const qtyDump = async (label) => {
    const info = await qtyLoc.evaluate((el) => ({
      value: el.value,
      codes: [...el.value].map((c) => "U+" + c.codePointAt(0).toString(16)),
      active: document.activeElement === el,
    }));
    console.log(`QTY ${label}:`, JSON.stringify(info));
  };
  await qtyDump("before title fill");
  await page.locator('[aria-label="شرح ردیف 1"]').fill("لپ‌تاپ اداری مدل X۵۰۰");
  await qtyDump("after title fill");
  await qtyLoc.fill("3");
  await page.waitForTimeout(200);
  await qtyDump("after qty fill");
  await page.locator('[aria-label="قیمت واحد"]').first().fill("12500000");
  await page.waitForTimeout(500);
  await qtyDump("after price fill");
  const qtyEvents = await page.evaluate(() => window.__qtyEvents);
  console.log("QTY EVENTS:", JSON.stringify(qtyEvents));
  await shot("05-editor-items.png");
  const titleVal = await page.locator('[aria-label="شرح ردیف 1"]').inputValue();
  const qtyVal = await page.locator('[aria-label="تعداد"]').first().inputValue();
  const priceVal = await page.locator('[aria-label="قیمت واحد"]').first().inputValue();
  const qtyRaw = await page.locator('[aria-label="تعداد"]').first().evaluate((el) => ({
    value: el.value,
    codes: [...el.value].map((c) => "U+" + c.codePointAt(0).toString(16)),
    selection: [el.selectionStart, el.selectionEnd],
    active: document.activeElement === el,
  }));
  console.log("QTY DUMP:", JSON.stringify(qtyRaw));
  check("item row accepted", titleVal === "لپ‌تاپ اداری مدل X۵۰۰", titleVal);
  check("quantity entered as 3", faToLatin(qtyVal).replace(/\D/g, "") === "3", `got "${qtyVal}"`);
  check("unit price entered", priceVal.replace(/[^\d]/g, "").length >= 7, `got "${priceVal}"`);

  await page.getByRole("button", { name: "مرحله بعد" }).click();
  await page.waitForTimeout(700);

  /* ------------------------- ۶) مرحله ۳: متن و امضا ------------------------- */
  await page
    .getByPlaceholder("مثلاً: از خرید شما سپاسگزاریم. کالاهای فروخته‌شده تا ۷ روز قابل تعویض هستند.")
    .fill("از خرید شما سپاسگزاریم.");
  await page.getByPlaceholder("مهر و امضای فروشنده").fill("مهر و امضای فروشنده");
  await page.getByPlaceholder("مهر و امضای خریدار").fill("مهر و امضای خریدار");
  await page.getByRole("button", { name: "مرحله بعد" }).click();
  await page.waitForTimeout(1000);
  await shot("06-editor-export.png");

  /* ------------------------- ۷) خروجی PDF ------------------------- */
  const [pdfDownload] = await Promise.all([
    page.waitForEvent("download", { timeout: 90000 }),
    page.getByRole("button", { name: "دانلود PDF" }).click(),
  ]);
  const pdfPath = path.join(OUT, "factor.pdf");
  await pdfDownload.saveAs(pdfPath);
  const pdfSize = fs.statSync(pdfPath).size;
  check("PDF downloaded", pdfSize > 20000, `${pdfSize} bytes`);

  await page.waitForTimeout(1500);

  /* ------------------------- ۸) خروجی Word ------------------------- */
  const [docxDownload] = await Promise.all([
    page.waitForEvent("download", { timeout: 90000 }),
    page.getByRole("button", { name: "دانلود Word" }).click(),
  ]);
  const docxPath = path.join(OUT, "factor.docx");
  await docxDownload.saveAs(docxPath);
  const docxSize = fs.statSync(docxPath).size;
  check("Word downloaded", docxSize > 10000, `${docxSize} bytes`);

  /* ------------------------- ۹) ذخیره فاکتور + تاریخچه ------------------------- */
  await page.getByRole("button", { name: "ذخیره فاکتور" }).click();
  await page.waitForTimeout(2500);
  const noticeText = await page.locator("body").innerText();
  check("invoice saved notice", /ذخیره شد/.test(noticeText), noticeText.match(/فاکتور[^\n]*ذخیره شد[^\n]*/)?.[0] ?? "");

  await page.goto(BASE + "/invoices", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot("07-invoices.png");
  const invoicesText = await page.locator("body").innerText();
  check("invoice appears in history", invoicesText.includes("۱۴۰۴-۹۹۹") || invoicesText.includes("شرکت آزمون خودکار"), invoicesText.slice(0, 120).replace(/\s+/g, " "));

  /* ------------------------- ۱۰) تم تاریک در ادیتور ------------------------- */
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForSelector("text=مرحله بعد", { timeout: 30000 });
  await page.locator('[data-theme-option="dark"]').click();
  await page.waitForTimeout(600);
  await shot("08-editor-dark.png");
  check(
    "dark theme persists to editor",
    await page.evaluate(() => document.documentElement.classList.contains("dark")),
  );

  /* ------------------------- ۱۱) پایداری پیش‌نویس ------------------------- */
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=مرحله بعد", { timeout: 30000 });
  await page.waitForTimeout(1200);
  const draftName = await page.getByPlaceholder("مثلاً شرکت نمونه تجارت کیم").inputValue();
  check("draft survives reload", draftName === "شرکت آزمون خودکار", draftName);

  /* ------------------------- ۱۲) خروجی از تم تاریک ------------------------- */
  await page.locator("text=خروجی").first().click().catch(() => {});
  await page.waitForTimeout(600);

  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
} catch (error) {
  check("script completed without exception", false, error.message);
  await shot("99-failure.png").catch(() => {});
} finally {
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n===== ${passed}/${results.length} checks passed =====`);
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ results, consoleErrors }, null, 2));
  await browser.close();
}
