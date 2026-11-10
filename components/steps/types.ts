import type { InvoiceData, InvoiceItem } from "@/lib/invoice";

export interface StepProps {
  data: InvoiceData;
  patchSeller: (patch: Partial<InvoiceData["seller"]>) => void;
  patchBuyer: (patch: Partial<InvoiceData["buyer"]>) => void;
  patchMeta: (patch: Partial<InvoiceData["meta"]>) => void;
  patchFooter: (patch: Partial<InvoiceData["footer"]>) => void;
  setItems: (items: InvoiceItem[]) => void;
}
