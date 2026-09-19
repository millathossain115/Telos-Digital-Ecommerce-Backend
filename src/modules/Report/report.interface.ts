export type TReportDatePreset =
  | "today"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom"
  | "all_time";

export interface IReportFilterPayload {
  dateRange?: TReportDatePreset;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  isExport?: boolean;
  status?: string;
  paymentMethod?: string;
  categoryId?: string;
  brandId?: string;
  stockStatus?: string;
}

// Profit Report Types
export interface IProfitReportSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  totalOrders: number;
  averageOrderValue: number;
  deliveredOrdersCount: number;
}

export interface IProfitReportItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string | null;
  itemsCount: number;
  orderTotal: number;
  deliveryFee: number;
  discount: number;
  estimatedCost: number;
  grossProfit: number;
  profitMargin: number;
  orderStatus: string;
  paymentStatus: string;
}

// Stock Report Types
export interface IStockReportSummary {
  totalProductsCount: number;
  totalUnitsInStock: number;
  totalInventoryCostValue: number;
  totalInventoryRetailValue: number;
  potentialProfit: number;
  outOfStockCount: number;
  lowStockCount: number;
}

export interface IStockReportItem {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  brandName?: string | null;
  stock: number;
  lowStockThreshold: number;
  unitCost: number;
  unitPrice: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  stockStatus: string;
  createdAt: string;
  updatedAt: string;
}

// Low Stock Report Types
export interface ILowStockReportSummary {
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  totalUnitsDeficit: number;
  estimatedRestockCost: number;
}

export interface ILowStockReportItem {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  brandName?: string | null;
  currentStock: number;
  lowStockThreshold: number;
  deficitUnits: number;
  unitCost: number;
  unitPrice: number;
  estimatedRestockInvestment: number;
  urgency: "CRITICAL" | "WARNING" | "ATTENTION";
  updatedAt: string;
}

// Transaction Report Types
export interface ITransactionReportSummary {
  totalTransactionsCount: number;
  totalAmount: number;
  successfulAmount: number;
  pendingAmount: number;
  breakdownByMethod: {
    method: string;
    count: number;
    amount: number;
  }[];
}

export interface ITransactionReportItem {
  id: string;
  trxId: string | null;
  orderId: string;
  orderNumber: string;
  paymentMethod: string;
  mfsNumber?: string | null;
  amount: number;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string | null;
}

// Sales Report Types
export interface ISalesReportSummary {
  totalGrossSales: number;
  totalNetSales: number;
  totalDiscounts: number;
  totalDeliveryFees: number;
  totalOrdersCount: number;
  averageOrderValue: number;
  totalItemsSold: number;
}

export interface ISalesReportItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerCity: string;
  customerPhone?: string | null;
  itemsCount: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  orderStatus: string;
  paymentStatus: string;
}
