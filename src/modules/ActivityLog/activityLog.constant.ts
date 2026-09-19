export const activityLogSearchableFields: string[] = [
  "action",
  "entity",
  "details",
  "actorName",
  "actorEmail",
  "ipAddress",
];

export const activityLogFilterableFields: string[] = [
  "category",
  "severity",
  "searchTerm",
  "startDate",
  "endDate",
];

export const activityLogSortableFields: string[] = [
  "createdAt",
  "action",
  "severity",
  "category",
];
