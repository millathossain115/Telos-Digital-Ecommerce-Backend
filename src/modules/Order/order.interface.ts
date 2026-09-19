import { OrderStatus, PaymentStatus } from "@prisma/client";

export interface TOrderItemPayload {
  productId?: string;
  variantId?: string;
  productName: string;
  productThumbnail?: string;
  productSku?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
}

export interface TOrderCustomerDetailsPayload {
  name: string;
  phone: string;
  email?: string;
  street: string;
  area?: string;
  union?: string;
  city: string;
  zone: "inside-dhaka" | "outside-dhaka";
  postalCode?: string;
  label?: string;
  deliveryNote?: string;
}

export interface TOrderTransactionPayload {
  paymentMethod: string; // Dynamic string e.g. "cod", "bkash", "nagad", "card", "upay"
  trxId?: string;
  mfsNumber?: string;
  amount?: number;
}

export interface TCreateOrderPayload {
  items: TOrderItemPayload[];
  customerDetails: TOrderCustomerDetailsPayload;
  transaction?: TOrderTransactionPayload;
  deliveryFee?: number;
  discount?: number;
  couponCode?: string;
}

export interface TUpdateOrderStatusPayload {
  status: OrderStatus;
  cancelReason?: string;
}

export interface TAssignCourierPayload {
  courierName: string;
  trackingNumber: string;
  estimatedDelivery?: string;
}

export interface TUpdateOrderPaymentPayload {
  paymentStatus?: PaymentStatus;
  transactionStatus?: string; // "verified", "rejected", "pending"
  trxId?: string;
  note?: string;
}

export interface TOrderFilterRequest {
  searchTerm?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface TCheckCheckoutStockItem {
  productId: string;
  variantId?: string | null;
  quantity?: number;
}

export interface TCheckCheckoutStockPayload {
  items: TCheckCheckoutStockItem[];
}

export type TStockIssueType =
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK"
  | "INACTIVE"
  | "NOT_FOUND";

export interface TCheckStockIssue {
  productId: string;
  variantId?: string | null;
  productName: string;
  requestedQuantity: number;
  availableStock: number;
  issueType: TStockIssueType;
  message: string;
}

export interface TCheckCheckoutStockResponse {
  allValid: boolean;
  issues: TCheckStockIssue[];
}

