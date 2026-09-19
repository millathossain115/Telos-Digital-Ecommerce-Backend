export const REPORT_DATE_PRESETS = [
  "today",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "custom",
  "all_time",
] as const;

export const DEFAULT_REPORT_PAGE_LIMIT = 12;
export const MAX_REPORT_EXPORT_LIMIT = 5000;

export const REPORT_SEARCHABLE_FIELDS = {
  profit: ["orderNumber", "customerDetails.name", "customerDetails.phone"],
  stock: ["name", "sku", "category.name", "brand.name"],
  lowStock: ["name", "sku", "category.name", "brand.name"],
  transaction: ["trxId", "mfsNumber", "order.orderNumber", "order.customerDetails.name", "order.customerDetails.phone"],
  sales: ["orderNumber", "customerDetails.name", "customerDetails.phone", "customerDetails.city"],
};
