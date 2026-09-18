import { StockAdjustmentType } from "@prisma/client";

export type TStockAdjustmentPayload = {
  productId: string;
  actionType: StockAdjustmentType;
  quantity: number;
  reason: string;
  note?: string;
};

export type TInventoryAuditFilterRequest = {
  searchTerm?: string;
  productId?: string;
  actionType?: StockAdjustmentType;
  reason?: string;
  startDate?: string;
  endDate?: string;
};
