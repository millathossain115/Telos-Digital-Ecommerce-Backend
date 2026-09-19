export interface TDashboardKpis {
  grossRevenue: number;
  grossRevenueChange: string;
  grossRevenuePositive: boolean;

  completedOrders: number;
  completedOrdersChange: string;
  completedOrdersPositive: boolean;

  avgOrderValue: number;
  avgOrderValueChange: string;
  avgOrderValuePositive: boolean;

  pendingOrders: number;
  pendingOrdersChange: string;
  pendingOrdersPositive: boolean;
}

export interface TRevenueDataPoint {
  label: string;
  revenue: number;
  orders: number;
  secondary: number;
}

export interface TRevenueAnalyticsResponse {
  viewMode: "daily" | "monthly";
  pace: string;
  totalSales: number;
  data: TRevenueDataPoint[];
}

export interface TPaymentChannelItem {
  name: string;
  method: string;
  volume: string;
  rawVolume: number;
  pct: number;
  color: string;
  barColor: string;
}

export interface TPaymentChannelsResponse {
  cashlessPercentage: number;
  channels: TPaymentChannelItem[];
}

export interface TStockAlertItem {
  id: string;
  name: string;
  thumbnail: string;
  stock: number;
  lowStockThreshold: number;
  sku: string;
  price: number;
}

export interface TStockAlertsResponse {
  lowStockCount: number;
  criticalCount: number;
  totalCatalogCount: number;
  items: TStockAlertItem[];
}

export interface TActionCenterResponse {
  unverifiedPayments: number;
  pendingDispatch: number;
  lowStockCount: number;
  pendingReviews: number;
}

export interface TTopProductItem {
  id: string;
  name: string;
  thumbnail: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  stock: number;
  category: string;
}

export interface TRecentActivityItem {
  id: string;
  actorName: string;
  actorAvatar: string | null;
  action: string;
  entity: string;
  category: string;
  severity: string;
  details: string;
  timestamp: string;
}
