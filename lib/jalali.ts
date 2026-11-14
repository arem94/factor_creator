/**
 * تبدیل تاریخ میلادی و شمسی (الگوریتم تقویم جلالی).
 * پیاده‌سازی مستقل و بدون وابستگی، مناسب برای مرورگر و سرور.
 */

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324,
  2394, 2456, 3178,
];

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;

  if (jy < jp || jy >= BREAKS[bl - 1]) {
    throw new Error(`سال شمسی نامعتبر: ${jy}`);
  }

  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;

  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): { jy: number; jm: number; jd: number } {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }

  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export function toJalali(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

export function toGregorian(jy: number, jm: number, jd: number): {
  gy: number;
  gm: number;
  gd: number;
} {
  return d2g(j2d(jy, jm, jd));
}

export function isLeapJalaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export const JALALI_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/** تاریخ شمسی امروز (بر اساس ساعت محلی) */
export function todayJalali(): JalaliDate {
  const now = new Date();
  return toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** ISO میلادی (YYYY-MM-DD) → شمسی */
export function isoToJalali(iso: string): JalaliDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const gy = Number(match[1]);
  const gm = Number(match[2]);
  const gd = Number(match[3]);
  if (gm < 1 || gm > 12 || gd < 1 || gd > 31) return null;
  try {
    return toJalali(gy, gm, gd);
  } catch {
    return null;
  }
}

/** شمسی → ISO میلادی (YYYY-MM-DD) */
export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

/** رشته‌ی «۱۴۰۴/۰۸/۲۰» یا «1404-8-20» → شمسی */
export function parseJalaliInput(input: string): JalaliDate | null {
  const normalized = input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\/\-.]/g, "/")
    .trim();

  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!match) return null;

  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);

  if (jm < 1 || jm > 12) return null;
  if (jd < 1 || jd > jalaliMonthLength(jy, jm)) return null;

  return { jy, jm, jd };
}

/** شمسی → رشته‌ی کوتاه ۱۴۰۴/۰۸/۲۰ */
export function formatJalaliShort(date: JalaliDate): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.jy}/${pad(date.jm)}/${pad(date.jd)}`;
}

/** شمسی → رشته‌ی خوانا ۲۰ آبان ۱۴۰۴ */
export function formatJalaliLong(date: JalaliDate): string {
  return `${date.jd} ${JALALI_MONTHS[date.jm - 1]} ${date.jy}`;
}

/** اولین روز ماه شمسی چند شنبه است؟ (۰ = شنبه) */
export function jalaliMonthStartWeekday(jy: number, jm: number): number {
  const { gy, gm, gd } = toGregorian(jy, jm, 1);
  const date = new Date(Date.UTC(gy, gm - 1, gd));
  // شنبه = 0 ... جمعه = 6
  return (date.getUTCDay() + 1) % 7;
}

/** افزودن ماه به تاریخ شمسی با اصلاح روز */
export function addJalaliMonths(date: JalaliDate, delta: number): JalaliDate {
  let jy = date.jy;
  let jm = date.jm + delta;

  while (jm > 12) {
    jm -= 12;
    jy += 1;
  }
  while (jm < 1) {
    jm += 12;
    jy -= 1;
  }

  const jd = Math.min(date.jd, jalaliMonthLength(jy, jm));
  return { jy, jm, jd };
}
