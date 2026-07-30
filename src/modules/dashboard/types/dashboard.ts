export type DashboardMetrics = {
  activeClients: number;
  activeMemberships: number;
  futureMemberships: number;
  expiredMemberships: number;
  membershipsExpiringSoon: number;
  incomeToday: number;
  incomeThisMonth: number;
};

export type RecentDashboardPayment = {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  paymentMethod: "cash" | "transfer" | "card";
  paymentDate: string;
  concept: string;
};

export type RecentDashboardClient = {
  id: string;
  fullName: string;
  status: "active" | "inactive";
  createdAt: string;
};

export type AttentionExpiringMembership = {
  id: string;
  clientId: string;
  clientName: string;
  planName: string;
  endDate: string;
  daysRemaining: number;
};

export type AttentionPendingPaymentMembership = {
  id: string;
  clientId: string;
  clientName: string;
  planName: string;
  status: "pending_payment" | "partial";
  remainingBalance: number;
};

export type AttentionRequiredSnapshot = {
  expiring: AttentionExpiringMembership[];
  expiringTotal: number;
  pendingPayments: AttentionPendingPaymentMembership[];
  pendingPaymentsTotal: number;
};

export type DashboardSnapshot = {
  metrics: DashboardMetrics;
  recentPayments: RecentDashboardPayment[];
  recentClients: RecentDashboardClient[];
  attentionRequired: AttentionRequiredSnapshot;
  errors: string[];
};
