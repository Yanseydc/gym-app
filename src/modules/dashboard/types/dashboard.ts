export type DashboardMetrics = {
  activeClients: number;
  activeMemberships: number;
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

export type DashboardSnapshot = {
  metrics: DashboardMetrics;
  recentPayments: RecentDashboardPayment[];
  recentClients: RecentDashboardClient[];
  errors: string[];
};
