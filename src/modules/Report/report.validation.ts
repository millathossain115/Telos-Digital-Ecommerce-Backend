import { z } from "zod";
import { REPORT_DATE_PRESETS } from "./report.constant";

const baseReportFilterSchema = z.object({
  dateRange: z.enum(REPORT_DATE_PRESETS).optional().default("all_time"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(12),
  isExport: z.boolean().optional().default(false),
});

const profitReportSchema = z.object({
  body: baseReportFilterSchema.extend({
    status: z.string().optional(),
  }),
});

const stockReportSchema = z.object({
  body: baseReportFilterSchema.extend({
    categoryId: z.string().optional(),
    brandId: z.string().optional(),
    stockStatus: z.string().optional(),
  }),
});

const lowStockReportSchema = z.object({
  body: baseReportFilterSchema.extend({
    categoryId: z.string().optional(),
    brandId: z.string().optional(),
  }),
});

const transactionReportSchema = z.object({
  body: baseReportFilterSchema.extend({
    paymentMethod: z.string().optional(),
    status: z.string().optional(),
  }),
});

const salesReportSchema = z.object({
  body: baseReportFilterSchema.extend({
    status: z.string().optional(),
    paymentMethod: z.string().optional(),
  }),
});

export const ReportValidation = {
  profitReportSchema,
  stockReportSchema,
  lowStockReportSchema,
  transactionReportSchema,
  salesReportSchema,
};
