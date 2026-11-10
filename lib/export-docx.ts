"use client";

import { formatJalali, formatNumber, formatQty, numberToPersianWords } from "./format";
import { downloadBlob } from "./download";
import { itemAmount, type InvoiceData, type Totals } from "./invoice";

const FONT = { ascii: "Tahoma", hAnsi: "Tahoma", cs: "Tahoma" } as const;
const INK = "1E293B";
const MUTED = "64748B";
const BRAND = "2D31D1";
const LINE = "E2E8F0";

/** متن‌های شماره‌ای (مثل ۱۴۰۴-۰۱۲ یا ۰۲۱-۸۸۷۷۶۶۵۵) را در جهت چپ‌به‌راست نگه می‌دارد */
function ltr(value: string): string {
  return `\u200E${value}\u200E`;
}

function measureImage(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve({ width: 0, height: 0 });
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

/**
 * فاکتور را به فایل Word (docx) تبدیل و دانلود می‌کند.
 * متن‌ها راست‌به‌چپ و با فونت Tahoma تولید می‌شوند تا در ویندوز بدون مشکل باز شود.
 */
export async function exportInvoiceDocx(
  data: InvoiceData,
  totals: Totals,
  filename: string,
): Promise<void> {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeightRule,
    ImageRun,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    VerticalAlignTable,
    WidthType,
  } = await import("docx");

  type DocxPara = InstanceType<typeof Paragraph>;
  type DocxBlock = DocxPara | InstanceType<typeof Table>;
  type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

  const { seller, buyer, meta, footer } = data;
  const currency = meta.currency;

  const NO_SIDE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = {
    top: NO_SIDE,
    bottom: NO_SIDE,
    left: NO_SIDE,
    right: NO_SIDE,
    insideHorizontal: NO_SIDE,
    insideVertical: NO_SIDE,
  };
  const thin = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const gridBorders = {
    top: thin,
    bottom: thin,
    left: thin,
    right: thin,
    insideHorizontal: thin,
    insideVertical: thin,
  };
  const cellMargins = { top: 90, bottom: 90, left: 110, right: 110 };
  const flatMargins = { top: 0, bottom: 0, left: 0, right: 0 };
  const pct = (size: number) => ({ size, type: WidthType.PERCENTAGE });

  const P = (
    text: string,
    options: {
      size?: number;
      bold?: boolean;
      color?: string;
      align?: Align;
      after?: number;
      before?: number;
    } = {},
  ) =>
    new Paragraph({
      alignment: options.align ?? AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { after: options.after ?? 40, before: options.before ?? 0 },
      children: [
        new TextRun({
          text,
          bold: options.bold,
          color: options.color ?? INK,
          size: options.size ?? 20,
          font: FONT,
          rightToLeft: true,
        }),
      ],
    });

  const blank = (after = 100) => new Paragraph({ spacing: { after } });

  /* ---------------------------------- سرصفحه --------------------------------- */
  const logo = seller.logo ? await measureImage(seller.logo) : null;
  const sellerChildren: DocxPara[] = [];

  if (seller.logo && logo && logo.width > 0 && logo.height > 0) {
    const scale = Math.min(130 / logo.width, 60 / logo.height, 1);
    sellerChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 100 },
        children: [
          new ImageRun({
            type: "png",
            data: seller.logo,
            transformation: {
              width: Math.max(1, Math.round(logo.width * scale)),
              height: Math.max(1, Math.round(logo.height * scale)),
            },
          }),
        ],
      }),
    );
  }

  sellerChildren.push(P(seller.name || "نام شرکت شما", { size: 32, bold: true, after: 30 }));

  if (seller.address) {
    sellerChildren.push(P(seller.address, { size: 16, color: MUTED, after: 20 }));
  }

  const contact = [
    seller.phone ? `تلفن: ${ltr(seller.phone)}` : "",
    seller.email,
    seller.website,
    seller.nationalId ? `شناسه ملی: ${seller.nationalId}` : "",
  ]
    .filter(Boolean)
    .join("   |   ");
  if (contact) sellerChildren.push(P(contact, { size: 16, color: MUTED }));

  const titleChildren: DocxPara[] = [
    P("INVOICE", { size: 14, bold: true, color: "96AEFF", after: 0 }),
    P("فاکتور فروش", { size: 40, bold: true, after: 60 }),
    P(`شماره فاکتور: ${ltr(meta.number || "—")}`, { size: 18, color: MUTED, after: 10 }),
    P(`تاریخ: ${formatJalali(meta.date)}`, { size: 18, color: MUTED, after: 10 }),
  ];
  if (meta.dueDate) {
    titleChildren.push(P(`مهلت پرداخت: ${formatJalali(meta.dueDate)}`, { size: 18, color: MUTED }));
  }

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    visuallyRightToLeft: true,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: pct(62),
            borders: noBorders,
            margins: flatMargins,
            verticalAlign: VerticalAlignTable.TOP,
            children: sellerChildren,
          }),
          new TableCell({
            width: pct(38),
            borders: noBorders,
            margins: flatMargins,
            verticalAlign: VerticalAlignTable.TOP,
            children: titleChildren,
          }),
        ],
      }),
    ],
  });

  /* ------------------------------- خریدار و متادیتا ------------------------------ */
  const buyerInfo: DocxPara[] = [
    P("مشخصات خریدار", { size: 16, bold: true, color: BRAND, after: 30 }),
    P(buyer.name || "—", { size: 22, bold: true, after: 30 }),
  ];
  if (buyer.address) buyerInfo.push(P(buyer.address, { size: 16, color: MUTED, after: 10 }));
  if (buyer.phone) buyerInfo.push(P(`تلفن: ${ltr(buyer.phone)}`, { size: 16, color: MUTED, after: 10 }));
  if (buyer.nationalId) {
    buyerInfo.push(P(`شناسه ملی: ${buyer.nationalId}`, { size: 16, color: MUTED, after: 10 }));
  }
  if (buyer.email) buyerInfo.push(P(buyer.email, { size: 16, color: MUTED, after: 10 }));

  const invoiceInfo: DocxPara[] = [
    P("اطلاعات فاکتور", { size: 16, bold: true, color: BRAND, after: 30 }),
    P(`واحد پول: ${currency}`, { size: 16, after: 10 }),
    P(`مهلت پرداخت: ${meta.dueDate ? formatJalali(meta.dueDate) : "—"}`, { size: 16, after: 10 }),
  ];
  if (footer.terms) {
    invoiceInfo.push(P(`شرایط پرداخت: ${footer.terms}`, { size: 16, color: MUTED }));
  }

  const partiesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: gridBorders,
    visuallyRightToLeft: true,
    margins: flatMargins,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: pct(58),
            margins: cellMargins,
            shading: { type: ShadingType.CLEAR, fill: "F8FAFC", color: "auto" },
            children: buyerInfo,
          }),
          new TableCell({
            width: pct(42),
            margins: cellMargins,
            children: invoiceInfo,
          }),
        ],
      }),
    ],
  });

  /* --------------------------------- اقلام فروش -------------------------------- */
  const columns: Array<{ label: string; width: number; align: Align }> = [
    { label: "#", width: 6, align: AlignmentType.CENTER },
    { label: "شرح کالا / خدمات", width: 36, align: AlignmentType.RIGHT },
    { label: "واحد", width: 9, align: AlignmentType.CENTER },
    { label: "تعداد", width: 9, align: AlignmentType.CENTER },
    { label: "قیمت واحد", width: 16, align: AlignmentType.CENTER },
    { label: "تخفیف", width: 8, align: AlignmentType.CENTER },
    { label: "مبلغ کل", width: 16, align: AlignmentType.CENTER },
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: columns.map(
      (column) =>
        new TableCell({
          width: pct(column.width),
          margins: cellMargins,
          verticalAlign: VerticalAlignTable.CENTER,
          shading: { type: ShadingType.CLEAR, fill: "EEF2FF", color: "auto" },
          children: [P(column.label, { size: 16, bold: true, align: column.align, after: 0 })],
        }),
    ),
  });

  const itemRows = data.items.map((item, index) => {
    const values = [
      formatNumber(index + 1),
      item.title || "—",
      item.unit || "—",
      formatQty(item.quantity),
      formatNumber(item.unitPrice),
      item.discount > 0 ? `${formatNumber(item.discount)}٪` : "—",
      formatNumber(itemAmount(item)),
    ];

    return new TableRow({
      children: values.map(
        (value, columnIndex) =>
          new TableCell({
            width: pct(columns[columnIndex].width),
            margins: cellMargins,
            verticalAlign: VerticalAlignTable.CENTER,
            shading:
              index % 2 === 1
                ? { type: ShadingType.CLEAR, fill: "F8FAFC", color: "auto" }
                : undefined,
            children: [
              P(value, {
                size: 16,
                align: columns[columnIndex].align,
                after: 0,
                color: columnIndex === 1 ? INK : MUTED,
              }),
            ],
          }),
      ),
    });
  });

  if (itemRows.length === 0) {
    itemRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: columns.length,
            margins: cellMargins,
            children: [P("اقلامی ثبت نشده است.", { size: 16, color: MUTED, align: AlignmentType.CENTER, after: 0 })],
          }),
        ],
      }),
    );
  }

  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: gridBorders,
    visuallyRightToLeft: true,
    margins: flatMargins,
    rows: [headerRow, ...itemRows],
  });

  /* ---------------------------------- جمع‌بندی --------------------------------- */
  const totalRows: Array<[string, string, boolean]> = [["جمع کل", formatNumber(totals.subtotal), false]];
  if (totals.discount > 0) totalRows.push(["تخفیف", `− ${formatNumber(totals.discount)}`, false]);
  if (meta.taxEnabled) {
    totalRows.push([
      `مالیات بر ارزش افزوده (${formatNumber(meta.taxRate)}٪)`,
      formatNumber(totals.tax),
      false,
    ]);
  }
  totalRows.push([`مبلغ قابل پرداخت (${currency})`, formatNumber(totals.total), true]);

  const totalsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: gridBorders,
    visuallyRightToLeft: true,
    margins: flatMargins,
    rows: totalRows.map(([label, value, strong]) => {
      const fill = strong ? { type: ShadingType.CLEAR, fill: "EEF2FF", color: "auto" } : undefined;
      return new TableRow({
        children: [
          new TableCell({
            width: pct(58),
            margins: cellMargins,
            shading: fill,
            children: [
              P(label, { size: strong ? 18 : 16, bold: strong, color: strong ? BRAND : MUTED, after: 0 }),
            ],
          }),
          new TableCell({
            width: pct(42),
            margins: cellMargins,
            shading: fill,
            children: [
              P(value, {
                size: strong ? 20 : 16,
                bold: strong,
                align: AlignmentType.LEFT,
                after: 0,
                color: strong ? BRAND : INK,
              }),
            ],
          }),
        ],
      });
    }),
  });

  const wordsChildren: DocxPara[] = [];
  if (footer.amountInWordsEnabled) {
    wordsChildren.push(P("مبلغ به حروف:", { size: 16, bold: true, color: MUTED, after: 30 }));
    wordsChildren.push(P(`${numberToPersianWords(totals.total)} ${currency}`, { size: 18 }));
  }

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    visuallyRightToLeft: true,
    margins: flatMargins,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: pct(58),
            borders: noBorders,
            margins: { top: 0, bottom: 0, left: 140, right: 0 },
            verticalAlign: VerticalAlignTable.TOP,
            children: wordsChildren.length ? wordsChildren : [P("", { after: 0 })],
          }),
          new TableCell({
            width: pct(42),
            borders: noBorders,
            margins: flatMargins,
            children: [totalsTable],
          }),
        ],
      }),
    ],
  });

  /* ------------------------------ یادداشت و امضاها ----------------------------- */
  const noteParagraphs: DocxPara[] = [];
  if (footer.note.trim()) {
    footer.note
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line, index) => {
        noteParagraphs.push(
          P(index === 0 ? `یادداشت: ${line}` : line, {
            size: 16,
            color: MUTED,
            after: 10,
            before: index === 0 ? 200 : 0,
          }),
        );
      });
  }

  const signatureCell = (label: string) =>
    new TableCell({
      width: pct(46),
      margins: { top: 60, bottom: 60, left: 140, right: 140 },
      verticalAlign: VerticalAlignTable.TOP,
      borders: {
        top: NO_SIDE,
        left: NO_SIDE,
        right: NO_SIDE,
        bottom: { style: BorderStyle.DASHED, size: 6, color: "CBD5E1" },
      },
      children: [P(label, { size: 16, color: MUTED, align: AlignmentType.CENTER })],
    });

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    visuallyRightToLeft: true,
    margins: flatMargins,
    rows: [
      new TableRow({
        height: { value: 800, rule: HeightRule.ATLEAST },
        children: [
          signatureCell(footer.signatureSeller || "مهر و امضای فروشنده"),
          new TableCell({
            width: pct(8),
            borders: noBorders,
            margins: flatMargins,
            children: [P("", { after: 0 })],
          }),
          signatureCell(footer.signatureBuyer || "مهر و امضای خریدار"),
        ],
      }),
    ],
  });

  const footerLine = P(
    [seller.name, seller.phone].filter(Boolean).join("   |   ") || "—",
    { size: 14, color: "94A3B8", align: AlignmentType.CENTER, before: 240 },
  );

  const children: DocxBlock[] = [headerTable, blank(160), partiesTable, blank(160), itemsTable, blank(140), summaryTable];

  if (noteParagraphs.length) {
    children.push(blank(120), ...noteParagraphs);
  }

  if (footer.signaturesEnabled) {
    children.push(blank(400), signatureTable);
  }

  children.push(footerLine);

  const doc = new Document({
    creator: seller.name || "فاکتورساز",
    title: `فاکتور فروش ${meta.number}`,
    description: `فاکتور فروش ${seller.name} برای ${buyer.name}`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 20, color: INK, rightToLeft: true },
          paragraph: { alignment: AlignmentType.RIGHT },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 850, right: 850, bottom: 850, left: 850 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}
