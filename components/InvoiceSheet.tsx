import { formatJalali, formatNumber, formatQty, numberToPersianWords } from "@/lib/format";
import { itemAmount, type InvoiceData, type Totals } from "@/lib/invoice";

interface InvoiceSheetProps {
  data: InvoiceData;
  totals: Totals;
  id?: string;
}

/**
 * پیش‌نمایش فاکتور در ابعاد واقعی A4.
 * فقط از رنگ‌ها و استایل‌های ساده استفاده می‌کند تا خروجی PDF
 * دقیقاً مثل همین چیزی که روی صفحه دیده می‌شود باشد.
 */
export function InvoiceSheet({ data, totals, id = "invoice-sheet" }: InvoiceSheetProps) {
  const { seller, buyer, meta, footer, items } = data;
  const currency = meta.currency;

  const fillerRows = Math.max(0, 6 - items.length);


  return (
    <div id={id} className="sheet" dir="rtl">
      <div className="sheet-accent" />

      {/* سرصفحه */}
      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-3.5">
          {seller.logo ? (
            <div className="flex h-[19mm] w-[25mm] shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-100 bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={seller.logo} alt="لوگوی شرکت" className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-[19mm] w-[19mm] shrink-0 items-center justify-center rounded-md bg-slate-50 text-[7pt] text-slate-300">
              لوگو
            </div>
          )}

          <div className="min-w-0">
            <div className="max-w-[88mm] text-[14.5pt] font-extrabold leading-snug text-slate-900">
              {seller.name || "نام شرکت شما"}
            </div>
            {seller.address ? (
              <p className="mt-1 max-w-[88mm] text-[7.6pt] leading-relaxed text-slate-500">
                {seller.address}
              </p>
            ) : null}
            {seller.phone || seller.nationalId || seller.email || seller.website ? (
              <div className="mt-1.5 max-w-[92mm] space-y-0.5 text-[7.6pt] text-slate-500">
                {seller.phone || seller.nationalId ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {seller.phone ? (
                      <span>
                        تلفن:{" "}
                        <bdi dir="ltr" className="font-medium text-slate-600">
                          {seller.phone}
                        </bdi>
                      </span>
                    ) : null}
                    {seller.nationalId ? (
                      <span>
                        شناسه ملی:{" "}
                        <bdi dir="ltr" className="font-medium text-slate-600">
                          {seller.nationalId}
                        </bdi>
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {seller.email || seller.website ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {seller.email ? (
                      <span className="break-all">
                        ایمیل:{" "}
                        <bdi dir="ltr" className="font-medium text-slate-600">
                          {seller.email}
                        </bdi>
                      </span>
                    ) : null}
                    {seller.website ? (
                      <span className="break-all">
                        وب‌سایت:{" "}
                        <bdi dir="ltr" className="font-medium text-slate-600">
                          {seller.website}
                        </bdi>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="w-[58mm] shrink-0">
          <div className="text-[7pt] font-bold tracking-[0.35em] text-brand-400">INVOICE</div>
          <div className="text-[16pt] font-extrabold leading-tight text-slate-900">فاکتور فروش</div>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[7.7pt]">
            <div className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-slate-400">شماره</span>
              <span className="font-bold tabular-nums text-slate-700">{meta.number || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-slate-400">تاریخ</span>
              <span className="font-bold text-slate-700">{formatJalali(meta.date)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-slate-400">واحد پول</span>
              <span className="font-bold text-slate-700">{currency}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 h-px w-full bg-slate-100" />

      {/* خریدار و شرایط پرداخت */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="text-[7pt] font-extrabold text-brand-700">مشخصات خریدار</div>
          <div className="mt-1 text-[9.5pt] font-bold text-slate-800">{buyer.name || "—"}</div>
          <div className="mt-1 space-y-0.5 text-[7.6pt] leading-relaxed text-slate-500">
            {buyer.address ? <div>{buyer.address}</div> : null}
            {buyer.phone ? (
              <div>
                تلفن: <span dir="ltr">{buyer.phone}</span>
              </div>
            ) : null}
            {buyer.nationalId ? (
              <div>
                شناسه ملی: <span dir="ltr">{buyer.nationalId}</span>
              </div>
            ) : null}
            {buyer.email ? <div className="break-all">{buyer.email}</div> : null}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-2.5">
          <div className="text-[7pt] font-extrabold text-brand-700">شرایط و اطلاعات پرداخت</div>
          <div className="mt-1 space-y-1 text-[7.6pt] leading-relaxed text-slate-600">
            <div className="flex gap-1.5">
              <span className="shrink-0 text-slate-400">مهلت پرداخت:</span>
              <span className="font-medium">{meta.dueDate ? formatJalali(meta.dueDate) : "—"}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="shrink-0 text-slate-400">روش پرداخت:</span>
              <span className="font-medium">{footer.terms || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* جدول اقلام */}
      <table className="sheet-table mt-3.5">
        <colgroup>
          <col style={{ width: "8mm" }} />
          <col />
          <col style={{ width: "17mm" }} />
          <col style={{ width: "15mm" }} />
          <col style={{ width: "29mm" }} />
          <col style={{ width: "14mm" }} />
          <col style={{ width: "31mm" }} />
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th className="text-right">شرح کالا / خدمات</th>
            <th>واحد</th>
            <th>تعداد</th>
            <th>قیمت واحد</th>
            <th>تخفیف</th>
            <th>مبلغ کل</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td className="text-center text-slate-400">{formatNumber(index + 1)}</td>
              <td className="font-medium text-slate-700">{item.title || "—"}</td>
              <td className="text-center text-slate-500">{item.unit || "—"}</td>
              <td className="text-center tabular-nums text-slate-600">{formatQty(item.quantity)}</td>
              <td className="text-center tabular-nums text-slate-600">{formatNumber(item.unitPrice)}</td>
              <td className="text-center tabular-nums text-slate-500">
                {item.discount > 0 ? `${formatNumber(item.discount)}٪` : "—"}
              </td>
              <td className="text-center font-bold tabular-nums text-slate-800">
                {formatNumber(itemAmount(item))}
              </td>
            </tr>
          ))}

          {Array.from({ length: fillerRows }).map((_, index) => (
            <tr key={`filler-${index}`} className="sheet-filler">
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* جمع‌بندی */}
      <div className="mt-3 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {footer.amountInWordsEnabled ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="text-[7pt] font-extrabold text-slate-400">مبلغ به حروف</div>
              <div className="mt-0.5 text-[8pt] font-medium leading-relaxed text-slate-700">
                {numberToPersianWords(totals.total)} {currency}
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-[62mm] shrink-0 text-[8pt]">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">جمع کل</span>
              <span className="font-semibold tabular-nums text-slate-700">
                {formatNumber(totals.subtotal)}
              </span>
            </div>
            {totals.discount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">تخفیف</span>
                <span className="font-semibold tabular-nums text-rose-500">
                  − {formatNumber(totals.discount)}
                </span>
              </div>
            ) : null}
            {meta.taxEnabled ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  مالیات بر ارزش افزوده ({formatNumber(meta.taxRate)}٪)
                </span>
                <span className="font-semibold tabular-nums text-slate-700">
                  {formatNumber(totals.tax)}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-1.5 flex items-center justify-between rounded-md bg-brand-600 px-2.5 py-1.5 text-white">
            <span className="text-[8pt] font-medium">مبلغ قابل پرداخت</span>
            <span className="text-[10pt] font-extrabold tabular-nums">
              {formatNumber(totals.total)}{" "}
              <span className="text-[6.8pt] font-normal opacity-90">{currency}</span>
            </span>
          </div>
        </div>
      </div>

      {/* یادداشت */}
      {footer.note.trim() ? (
        <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-2.5 text-[7.4pt] leading-relaxed text-slate-500">
          <span className="font-bold text-slate-600">یادداشت: </span>
          <span className="whitespace-pre-line">{footer.note}</span>
        </div>
      ) : null}

      {/* امضا و پایین صفحه */}
      <div className="mt-auto pt-6">
        {footer.signaturesEnabled ? (
          <div className="grid grid-cols-2 gap-10">
            {[
              { label: footer.signatureSeller || "مهر و امضای فروشنده", name: seller.name },
              { label: footer.signatureBuyer || "مهر و امضای خریدار", name: buyer.name },
            ].map((signature) => (
              <div key={signature.label}>
                <div className="text-[7.6pt] font-medium text-slate-500">{signature.label}</div>
                <div className="mt-1 flex h-[21mm] items-end justify-center rounded-md border border-dashed border-slate-300 pb-1.5 text-[6.8pt] text-slate-300">
                  {signature.name}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-1.5 text-[6.8pt] text-slate-400">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{seller.name || "فاکتور فروش"}</span>
            {seller.phone ? (
              <span dir="ltr" className="shrink-0 tabular-nums">
                {seller.phone}
              </span>
            ) : null}
          </span>
          <span className="shrink-0">این فاکتور با فاکتورساز صادر شده است</span>
        </div>
      </div>
    </div>
  );
}
