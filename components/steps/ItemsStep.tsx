"use client";

import { formatNumber, numberToPersianWords } from "@/lib/format";
import {
  UNITS,
  calcTotals,
  createItem,
  itemAmount,
  type InvoiceItem,
} from "@/lib/invoice";
import { PlusIcon, ReceiptIcon, TrashIcon } from "@/components/icons";
import {
  AmountInput,
  Field,
  NumericInput,
  Section,
  Switch,
  TextInput,
} from "@/components/ui";
import type { StepProps } from "./types";

export function ItemsStep({ data, setItems, patchMeta }: StepProps) {
  const totals = calcTotals(data);
  const currency = data.meta.currency;

  const updateItem = (id: string, patch: Partial<InvoiceItem>) => {
    setItems(data.items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    const last = data.items[data.items.length - 1];
    setItems([
      ...data.items,
      createItem({
        unit: last?.unit ?? "عدد",
        unitPrice: last?.unitPrice ?? 0,
        discount: 0,
      }),
    ]);
  };

  const removeItem = (id: string) => {
    if (data.items.length <= 1) {
      setItems([createItem()]);
      return;
    }
    setItems(data.items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-5">
      <Section
        title="اقلام فروش"
        description="برای هر ردیف، شرح، واحد، تعداد، قیمت واحد و درصد تخفیف را وارد کنید."
        icon={<ReceiptIcon className="h-5 w-5" />}
        action={
          <button type="button" className="btn btn-soft" onClick={addItem}>
            <PlusIcon className="h-4 w-4" />
            افزودن ردیف
          </button>
        }
      >
        <div className="space-y-3">
          {data.items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl border border-line bg-surface p-3.5 transition hover:border-line-strong"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-[11px] font-bold text-brand-ink">
                  {formatNumber(index + 1)}
                </span>
                <TextInput
                  value={item.title}
                  onChange={(event) => updateItem(item.id, { title: event.target.value })}
                  placeholder="شرح کالا یا خدمت — مثلاً لپ‌تاپ اداری مدل X۵۰۰"
                  aria-label={`شرح ردیف ${index + 1}`}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="btn btn-ghost btn-icon text-muted hover:text-rose-500 dark:hover:text-rose-400"
                  aria-label={`حذف ردیف ${index + 1}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-12">
                <div className="col-span-1 sm:col-span-3">
                  <span className="label text-[11px]">واحد</span>
                  <TextInput
                    list="invoice-units"
                    value={item.unit}
                    onChange={(event) => updateItem(item.id, { unit: event.target.value })}
                    placeholder="عدد"
                    aria-label="واحد"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <span className="label text-[11px]">تعداد</span>
                  <NumericInput
                    allowDecimal
                    value={item.quantity}
                    onChange={(quantity) => updateItem(item.id, { quantity })}
                    suffix={item.unit || "عدد"}
                    ariaLabel="تعداد"
                  />
                </div>

                <div className="col-span-2 sm:col-span-3">
                  <span className="label text-[11px]">قیمت واحد ({currency})</span>
                  <AmountInput
                    value={item.unitPrice}
                    onChange={(unitPrice) => updateItem(item.id, { unitPrice })}
                    currency={currency}
                    showHint={false}
                    ariaLabel="قیمت واحد"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <span className="label text-[11px]">تخفیف</span>
                  <NumericInput
                    max={100}
                    value={item.discount}
                    onChange={(discount) => updateItem(item.id, { discount })}
                    suffix="٪"
                    ariaLabel="درصد تخفیف"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <span className="label text-[11px]">جمع ردیف</span>
                  <div className="rounded-xl bg-surface-2 px-2.5 py-2.5 text-center text-[12px] font-bold tabular-nums text-ink-soft">
                    {formatNumber(itemAmount(item))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-surface-2/60 py-3 text-[13px] font-medium text-muted transition hover:border-brand-300 hover:bg-brand-soft/60 hover:text-brand-ink"
        >
          <PlusIcon className="h-4 w-4" />
          افزودن ردیف جدید
        </button>

        <datalist id="invoice-units">
          {UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
      </Section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Section
          title="مالیات"
          description="در صورت نیاز، مالیات بر ارزش افزوده را فعال کنید."
          className="self-start"
        >
          <div className="space-y-4">
            <Switch
              checked={data.meta.taxEnabled}
              onChange={(taxEnabled) => patchMeta({ taxEnabled })}
              label="محاسبه مالیات بر ارزش افزوده"
              description="درصد مالیات روی مبلغ پس از کسر تخفیف اعمال می‌شود."
            />
            <Field label="درصد مالیات">
              <NumericInput
                value={data.meta.taxRate}
                max={100}
                suffix="٪"
                onChange={(taxRate) => patchMeta({ taxRate })}
                ariaLabel="درصد مالیات"
              />
            </Field>
          </div>
        </Section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-[15px] font-bold text-ink">جمع‌بندی فاکتور</h2>
          <p className="mt-0.5 text-xs text-muted">
            {formatNumber(totals.itemCount)} ردیف، {formatNumber(totals.quantityTotal)} واحد کالا
          </p>

          <dl className="mt-4 space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <dt className="text-muted">جمع کل</dt>
              <dd className="font-semibold tabular-nums text-ink-soft">
                {formatNumber(totals.subtotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">تخفیف</dt>
              <dd className="font-semibold tabular-nums text-rose-500 dark:text-rose-400">
                {totals.discount > 0 ? `− ${formatNumber(totals.discount)}` : "—"}
              </dd>
            </div>
            {data.meta.taxEnabled ? (
              <div className="flex items-center justify-between">
                <dt className="text-muted">
                  مالیات ({formatNumber(data.meta.taxRate)}٪)
                </dt>
                <dd className="font-semibold tabular-nums text-ink-soft">
                  {formatNumber(totals.tax)}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-600 px-3.5 py-3 text-white">
            <span className="text-[13px] font-medium">مبلغ قابل پرداخت</span>
            <span className="text-[15px] font-extrabold tabular-nums">
              {formatNumber(totals.total)}
              <span className="mr-1 text-[10px] font-normal opacity-90">{currency}</span>
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
            <div className="text-[10px] font-bold text-muted">مبلغ به حروف</div>
            <div className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
              {numberToPersianWords(totals.total)} {currency}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
