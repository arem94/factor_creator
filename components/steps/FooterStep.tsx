"use client";

import { PenIcon, SparkIcon } from "@/components/icons";
import { Field, Section, Switch, TextArea, TextInput } from "@/components/ui";
import type { StepProps } from "./types";

export function FooterStep({ data, patchFooter }: StepProps) {
  const { footer } = data;

  return (
    <div className="space-y-5">
      <Section
        title="متن پایانی فاکتور"
        description="یادداشت تشکر، قوانین مرجوعی یا هر توضیحی که باید پایین فاکتور چاپ شود."
        icon={<SparkIcon className="h-5 w-5" />}
      >
        <Field
          label="یادداشت پایانی"
          hint="خطوط جدید همان‌طور که می‌نویسید در فاکتور نمایش داده می‌شوند."
        >
          <TextArea
            rows={5}
            value={footer.note}
            onChange={(event) => patchFooter({ note: event.target.value })}
            placeholder="مثلاً: از خرید شما سپاسگزاریم. کالاهای فروخته‌شده تا ۷ روز قابل تعویض هستند."
          />
        </Field>

        <Field
          label="شرایط پرداخت"
          className="mt-4"
          hint="در کادر «شرایط و اطلاعات پرداخت» بالای جدول اقلام چاپ می‌شود."
        >
          <TextInput
            value={footer.terms}
            onChange={(event) => patchFooter({ terms: event.target.value })}
            placeholder="۵۰٪ پیش‌پرداخت و مابقی هنگام تحویل"
          />
        </Field>

        <div className="mt-4">
          <Switch
            checked={footer.amountInWordsEnabled}
            onChange={(amountInWordsEnabled) => patchFooter({ amountInWordsEnabled })}
            label="مبلغ به حروف نمایش داده شود"
            description="مبلغ کل فاکتور به صورت حروف فارسی زیر جدول نوشته می‌شود."
          />
        </div>
      </Section>

      <Section
        title="جای امضا"
        description="دو کادر خط‌چین در پایین فاکتور برای مهر و امضای فروشنده و خریدار."
        icon={<PenIcon className="h-5 w-5" />}
      >
        <Switch
          checked={footer.signaturesEnabled}
          onChange={(signaturesEnabled) => patchFooter({ signaturesEnabled })}
          label="کادرهای امضا نمایش داده شود"
          description="اگر فاکتور را بدون امضا می‌خواهید، این گزینه را خاموش کنید."
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="عنوان کادر امضای فروشنده">
            <TextInput
              value={footer.signatureSeller}
              onChange={(event) => patchFooter({ signatureSeller: event.target.value })}
              placeholder="مهر و امضای فروشنده"
              disabled={!footer.signaturesEnabled}
            />
          </Field>

          <Field label="عنوان کادر امضای خریدار">
            <TextInput
              value={footer.signatureBuyer}
              onChange={(event) => patchFooter({ signatureBuyer: event.target.value })}
              placeholder="مهر و امضای خریدار"
              disabled={!footer.signaturesEnabled}
            />
          </Field>
        </div>

        {footer.signaturesEnabled ? (
          <div className="mt-4 grid gap-6 rounded-2xl border border-line bg-surface-2/70 p-4 sm:grid-cols-2">
            {[
              { label: footer.signatureSeller || "مهر و امضای فروشنده", name: data.seller.name },
              { label: footer.signatureBuyer || "مهر و امضای خریدار", name: data.buyer.name },
            ].map((signature, index) => (
              <div key={index}>
                <div className="text-[11px] font-medium text-muted">{signature.label}</div>
                <div className="mt-1.5 flex h-20 items-end justify-center rounded-lg border border-dashed border-line-strong bg-surface pb-1.5 text-[10px] text-muted">
                  {signature.name || "—"}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Section>
    </div>
  );
}
