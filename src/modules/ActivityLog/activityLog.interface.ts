import { ActivityCategory, ActivitySeverity } from "@prisma/client";

export type TActivitySeverity = "info" | "success" | "warning" | "danger";

export type TActivityCategory =
  | "auth"
  | "catalog"
  | "orders"
  | "payments"
  | "security"
  | "settings";

export interface IActivityActor {
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}

export interface TActivityLogResponse {
  id: string;
  timestamp: string; // ISO 8601
  actor: IActivityActor;
  action: string;
  entity: string;
  entityId?: string | null;
  category: TActivityCategory;
  severity: TActivitySeverity;
  details: string;
  ipAddress: string;
  device: string;
  location: string;
}

export interface TCreateActivityLogPayload {
  adminId?: string | null;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  actorAvatar?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  category: ActivityCategory | TActivityCategory;
  severity?: ActivitySeverity | TActivitySeverity;
  details: string;
  ipAddress?: string | null;
  device?: string | null;
  location?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TActivityLogFilterRequest {
  searchTerm?: string;
  category?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

export interface TActivitySummaryResponse {
  totalCount: number;
  criticalCount: number;
  securityCount: number;
}
