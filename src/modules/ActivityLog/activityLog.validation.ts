import { z } from "zod";

const getActivityLogsValidationSchema = z.object({
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      searchTerm: z.string().optional(),
      category: z.string().optional(),
      severity: z.string().optional(),
      startDate: z.string().datetime({ offset: true }).optional(),
      endDate: z.string().datetime({ offset: true }).optional(),
    })
    .optional(),
});

export const ActivityLogValidation = {
  getActivityLogsValidationSchema,
};
