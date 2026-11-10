"use client";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/** اطمینان از بارگذاری فونت‌ها و تصاویر پیش از عکس‌برداری */
async function waitForAssets(element: HTMLElement): Promise<void> {
  try {
    await document.fonts.ready;
  } catch {
    /* بی‌اهمیت */
  }

  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );

  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 16);
    }
  });
}

/**
 * عنصر پیش‌نمایش فاکتور را به تصویر با کیفیت تبدیل می‌کند.
 * از html-to-image استفاده می‌کنیم چون فونت فارسی را داخل خروجی جاسازی می‌کند
 * و متن دقیقاً با همان فاصله‌ها و شکل پیش‌نمایش رندر می‌شود.
 */
async function captureInvoice(element: HTMLElement): Promise<HTMLCanvasElement> {
  const { toCanvas } = await import("html-to-image");

  return toCanvas(element, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
    cacheBust: true,
    width: element.offsetWidth,
    height: element.offsetHeight,
    style: { margin: "0", transform: "none", boxShadow: "none" },
  });
}

/** عنصر پیش‌نمایش فاکتور را به PDF چندصفحه‌ای A4 تبدیل و دانلود می‌کند. */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  await waitForAssets(element);
  const canvas = await captureInvoice(element);

  if (!canvas.width || !canvas.height) {
    throw new Error("تصویربرداری از فاکتور ناموفق بود. دوباره تلاش کنید.");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pxPerMm = canvas.width / A4_WIDTH_MM;
  const sliceHeightPx = Math.max(1, Math.round(A4_HEIGHT_MM * pxPerMm));
  const isSinglePage = canvas.height <= sliceHeightPx + 2;

  if (isSinglePage) {
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.95),
      "JPEG",
      0,
      0,
      A4_WIDTH_MM,
      A4_HEIGHT_MM,
    );
  } else {
    let offset = 0;
    let pageIndex = 0;

    while (offset < canvas.height) {
      const sliceHeight = Math.min(sliceHeightPx, canvas.height - offset);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;

      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error("پردازش تصویر در این مرورگر ممکن نیست.");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        offset,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      );

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        pageCanvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        0,
        0,
        A4_WIDTH_MM,
        sliceHeight / pxPerMm || A4_HEIGHT_MM,
      );

      offset += sliceHeight;
      pageIndex += 1;
    }
  }

  pdf.save(filename);
}
