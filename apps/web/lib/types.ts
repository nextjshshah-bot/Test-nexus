export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MetricRange = '7d' | '30d' | '90d' | '12m';
export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  company: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountOverview {
  user: User;
  plan: string;
  stats: {
    projectCount: number;
    activeSessions: number;
    projectsCreatedLast30Days: number;
    projectGrowth: number;
    activeProjects: number;
    completionRate: number;
  };
  seatUsage: { used: number; limit: number };
  usage: { apiCallsThisMonth: number; storageUsedMb: number };
  billing: { nextInvoiceDate: string; amountDue: number; currency: string };
}

export interface ProjectMetricsSummary {
  visits30d: number;
  signups30d: number;
  revenue30d: number;
  conversionRate30d: number;
  lastActivityDate: string | null;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  budget: number;
  progress: number;
  tags: string[];
  startDate: string | null;
  dueDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string };
  metrics?: ProjectMetricsSummary;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ProjectStats {
  total: number;
  byStatus: Record<ProjectStatus, number>;
  byPriority: Record<Priority, number>;
  totalBudget: number;
  averageProgress: number;
  overdue: number;
  dueSoon: number;
  completedThisMonth: number;
}

export interface TimeseriesPoint {
  date: string;
  label: string;
  visits: number;
  signups: number;
  conversions: number;
  revenue: number;
  churnRate: number;
}

export interface MetricTotals {
  visits: number;
  signups: number;
  conversions: number;
  revenue: number;
  churnedUsers: number;
  avgSessionSeconds: number;
}

export interface OverviewResponse {
  range: MetricRange;
  periodStart: string;
  periodEnd: string;
  totals: MetricTotals & { conversionRate: number; churnRate: number; arpu: number };
  previousTotals: MetricTotals & { conversionRate: number };
  deltas: {
    visits: number;
    signups: number;
    revenue: number;
    conversions: number;
    conversionRate: number;
    churnRate: number;
  };
  timeseries: TimeseriesPoint[];
  statusBreakdown: Array<{ status: ProjectStatus; count: number; budget: number }>;
  priorityBreakdown: Array<{ priority: Priority; count: number }>;
  topProjects: Array<{
    id: string;
    name: string;
    status: ProjectStatus;
    revenue: number;
    visits: number;
    signups: number;
    conversionRate: number;
    progress: number;
    trend: number[];
    trendDelta: number;
  }>;
  insights: Array<{ tone: 'positive' | 'warning' | 'neutral'; title: string; detail: string }>;
}

export interface ActivityEntry {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  project: { id: string; name: string; slug: string } | null;
  metadata: unknown;
}

export interface SessionEntry {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ProjectFormValues {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  budget: number;
  progress: number;
  tags: string;
  startDate: string;
  dueDate: string;
}

export interface ProjectListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ProjectStatus | 'ALL';
  priority?: Priority | 'ALL';
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'budget' | 'progress' | 'dueDate';
  sortOrder?: 'asc' | 'desc';
}
