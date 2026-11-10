"use client";

export const ACCEPTED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
];

export const MAX_LOGO_BYTES = 3 * 1024 * 1024;

export interface LogoInfo {
  dataUrl: string;
  width: number;
  height: number;
}

export class LogoError extends Error {}

/** فایل تصویر را می‌خواند، اندازه‌اش را کوچک می‌کند و به PNG تبدیل می‌کند */
export async function fileToLogo(file: File, maxSize = 512): Promise<LogoInfo> {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    throw new LogoError("فرمت تصویر پشتیبانی نمی‌شود. از PNG، JPG، WEBP یا SVG استفاده کنید.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new LogoError("حجم لوگو نباید بیشتر از ۳ مگابایت باشد.");
  }

  const dataUrl = await readAsDataUrl(file);
  return normalizeLogo(dataUrl, maxSize);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new LogoError("خواندن فایل لوگو ناموفق بود."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new LogoError("تصویر لوگو قابل خواندن نیست."));
    image.src = src;
  });
}

/** تصویر را به ابعاد معقول درمی‌آورد (برای ذخیره‌سازی سبک‌تر) و PNG می‌کند */
export async function normalizeLogo(dataUrl: string, maxSize = 512): Promise<LogoInfo> {
  const image = await loadImage(dataUrl);
  const naturalWidth = image.naturalWidth || image.width || 1;
  const naturalHeight = image.naturalHeight || image.height || 1;
  const ratio = Math.min(1, maxSize / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * ratio));
  const height = Math.max(1, Math.round(naturalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new LogoError("پردازش تصویر در این مرورگر ممکن نیست.");

  // SVGهای بدون پس‌زمینه روی پرده سفید تا در PDF/Word درست دیده شوند
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width,
    height,
  };
}
