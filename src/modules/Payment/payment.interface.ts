export interface IPaymentFilterRequest {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: string;
  method?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface IVerifyTransactionPayload {
  status: "verified" | "rejected" | "pending";
  note?: string;
}

export interface IPaymentTransactionResponse {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  amount: number;
  method: "bkash" | "nagad" | "card" | "cod";
  trxId: string | null;
  mfsNumber: string | null;
  date: string;
  status: "verified" | "pending_verification" | "rejected" | "settled";
  note?: string | null;
}

export interface IPaymentStats {
  totalVolume: number;
  verifiedVolume: number;
  pendingVolume: number;
  rejectedVolume: number;
  totalCount: number;
  pendingCount: number;
}
