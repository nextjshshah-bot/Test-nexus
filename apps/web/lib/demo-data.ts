import type {
  AccountOverview,
  ActivityEntry,
  MetricRange,
  OverviewResponse,
  Project,
  ProjectStats,
  TimeseriesPoint,
  User,
} from './types';

/**
 * Offline dataset. Used only when NEXT_PUBLIC_AUTH_MODE=demo or when the API
 * cannot be reached, so the dashboard never renders an empty shell in a
 * network-restricted preview environment. The UI always labels demo mode.
 */

export const DEMO_USER: User = {
  id: 'demo-user',
  email: 'demo@nexuscore.dev',
  name: 'Demo Analyst',
  role: 'ADMIN',
  company: 'NexusCore Labs',
  jobTitle: 'Head of Product Analytics',
  avatarUrl: null,
  lastLoginAt: new Date().toISOString(),
  createdAt: new Date(Date.now() - 400 * 86_400_000).toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEMO_CREDENTIALS = { email: 'demo@nexuscore.dev', password: 'Password123!' };

const OWNER = { id: DEMO_USER.id, name: DEMO_USER.name, email: DEMO_USER.email };

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function dayString(daysFromNowValue: number): string {
  return new Date(Date.now() + daysFromNowValue * 86_400_000).toISOString().slice(0, 10);
}

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'prj_atlas',
    name: 'Atlas Checkout Revamp',
    slug: 'atlas-checkout-revamp',
    description: 'Rebuild the multi-step checkout flow with saved payment methods and one-tap upsells.',
    status: 'ACTIVE',
    priority: 'CRITICAL',
    budget: 184_000,
    progress: 72,
    tags: ['payments', 'experiment', 'q4'],
    startDate: dayString(-120),
    dueDate: dayString(24),
    archivedAt: null,
    createdAt: daysFromNow(-120),
    updatedAt: daysFromNow(-1),
    owner: OWNER,
    metrics: { visits30d: 128_450, signups30d: 4_120, revenue30d: 198_400, conversionRate30d: 4.1, lastActivityDate: dayString(0) },
  },
  {
    id: 'prj_orbit',
    name: 'Orbit Marketing Site',
    slug: 'orbit-marketing-site',
    description: 'Programmatic landing pages with A/B variant routing and a headless CMS pipeline.',
    status: 'ACTIVE',
    priority: 'HIGH',
    budget: 62_500,
    progress: 58,
    tags: ['marketing', 'seo'],
    startDate: dayString(-90),
    dueDate: dayString(41),
    archivedAt: null,
    createdAt: daysFromNow(-90),
    updatedAt: daysFromNow(-2),
    owner: OWNER,
    metrics: { visits30d: 186_300, signups30d: 3_870, revenue30d: 121_900, conversionRate30d: 2.8, lastActivityDate: dayString(0) },
  },
  {
    id: 'prj_pulse',
    name: 'Pulse Mobile App',
    slug: 'pulse-mobile-app',
    description: 'React Native companion app with push notifications, offline cache, and biometric login.',
    status: 'ACTIVE',
    priority: 'HIGH',
    budget: 241_000,
    progress: 44,
    tags: ['mobile', 'react-native'],
    startDate: dayString(-60),
    dueDate: dayString(96),
    archivedAt: null,
    createdAt: daysFromNow(-60),
    updatedAt: daysFromNow(-3),
    owner: OWNER,
    metrics: { visits30d: 91_200, signups30d: 4_740, revenue30d: 302_100, conversionRate30d: 5.2, lastActivityDate: dayString(0) },
  },
  {
    id: 'prj_helios',
    name: 'Helios Data Warehouse',
    slug: 'helios-data-warehouse',
    description: 'Consolidate event streams into a warehouse with dbt models and reconciliation jobs.',
    status: 'PAUSED',
    priority: 'MEDIUM',
    budget: 96_000,
    progress: 35,
    tags: ['data', 'infrastructure'],
    startDate: dayString(-200),
    dueDate: dayString(-6),
    archivedAt: null,
    createdAt: daysFromNow(-200),
    updatedAt: daysFromNow(-9),
    owner: OWNER,
    metrics: { visits30d: 15_600, signups30d: 280, revenue30d: 58_900, conversionRate30d: 1.8, lastActivityDate: dayString(-4) },
  },
  {
    id: 'prj_vertex',
    name: 'Vertex Admin Console',
    slug: 'vertex-admin-console',
    description: 'Internal operations console with role-based access, audit trails, and bulk workflows.',
    status: 'PLANNING',
    priority: 'MEDIUM',
    budget: 48_000,
    progress: 12,
    tags: ['internal', 'rbac'],
    startDate: dayString(-18),
    dueDate: dayString(150),
    archivedAt: null,
    createdAt: daysFromNow(-18),
    updatedAt: daysFromNow(-4),
    owner: OWNER,
    metrics: { visits30d: 11_400, signups30d: 690, revenue30d: 28_700, conversionRate30d: 6.1, lastActivityDate: dayString(-1) },
  },
  {
    id: 'prj_lumen',
    name: 'Lumen AI Assistant',
    slug: 'lumen-ai-assistant',
    description: 'Embedded assistant that summarises account activity and drafts follow-up sequences.',
    status: 'ACTIVE',
    priority: 'CRITICAL',
    budget: 315_000,
    progress: 61,
    tags: ['ai', 'llm', 'growth'],
    startDate: dayString(-75),
    dueDate: dayString(58),
    archivedAt: null,
    createdAt: daysFromNow(-75),
    updatedAt: daysFromNow(-1),
    owner: OWNER,
    metrics: { visits30d: 72_000, signups30d: 2_380, revenue30d: 254_600, conversionRate30d: 3.3, lastActivityDate: dayString(0) },
  },
  {
    id: 'prj_cobalt',
    name: 'Cobalt Billing Migration',
    slug: 'cobalt-billing-migration',
    description: 'Move legacy invoices to metered billing with proration and dunning automation.',
    status: 'COMPLETED',
    priority: 'HIGH',
    budget: 132_000,
    progress: 100,
    tags: ['billing', 'migration'],
    startDate: dayString(-320),
    dueDate: dayString(-45),
    archivedAt: null,
    createdAt: daysFromNow(-320),
    updatedAt: daysFromNow(-40),
    owner: OWNER,
    metrics: { visits30d: 27_000, signups30d: 810, revenue30d: 176_300, conversionRate30d: 4.5, lastActivityDate: dayString(-12) },
  },
  {
    id: 'prj_nimbus',
    name: 'Nimbus CDN Rollout',
    slug: 'nimbus-cdn-rollout',
    description: 'Edge caching and image optimisation across three regions to cut p75 TTFB.',
    status: 'COMPLETED',
    priority: 'LOW',
    budget: 27_500,
    progress: 100,
    tags: ['performance', 'edge'],
    startDate: dayString(-260),
    dueDate: dayString(-120),
    archivedAt: null,
    createdAt: daysFromNow(-260),
    updatedAt: daysFromNow(-110),
    owner: OWNER,
    metrics: { visits30d: 43_500, signups30d: 320, revenue30d: 12_400, conversionRate30d: 2.2, lastActivityDate: dayString(-30) },
  },
  {
    id: 'prj_quartz',
    name: 'Quartz Partner Portal',
    slug: 'quartz-partner-portal',
    description: 'Self-serve partner onboarding, revenue share reporting, and co-marketing assets.',
    status: 'ARCHIVED',
    priority: 'LOW',
    budget: 41_000,
    progress: 88,
    tags: ['partners', 'legacy'],
    startDate: dayString(-400),
    dueDate: dayString(-180),
    archivedAt: daysFromNow(-150),
    createdAt: daysFromNow(-400),
    updatedAt: daysFromNow(-150),
    owner: OWNER,
    metrics: { visits30d: 7_800, signups30d: 96, revenue30d: 9_250, conversionRate30d: 2.6, lastActivityDate: dayString(-60) },
  },
];

const RANGE_DAYS: Record<MetricRange, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function buildTimeseries(range: MetricRange): TimeseriesPoint[] {
  const days = RANGE_DAYS[range];
  const bucketCount = range === '12m' ? 12 : range === '90d' ? 13 : range === '30d' ? 30 : 7;
  const bucketSize = Math.max(1, Math.round(days / bucketCount));
  const random = seededRandom(range.length * 977 + days);
  const points: TimeseriesPoint[] = [];

  const baseVisits = 14_200;
  const baseRevenue = 21_400;

  for (let index = bucketCount - 1; index >= 0; index -= 1) {
    const offsetDays = index * bucketSize;
    const date = new Date(Date.now() - offsetDays * 86_400_000);
    const growth = 1 + (bucketCount - 1 - index) * (range === '12m' ? 0.045 : 0.012);
    const seasonality = 0.9 + 0.2 * Math.sin(((bucketCount - index) / bucketCount) * Math.PI * 2);
    const noise = 0.9 + random() * 0.2;

    const visits = Math.round(baseVisits * bucketSize * growth * seasonality * noise);
    const conversions = Math.round(visits * (0.032 + random() * 0.012));
    const signups = Math.round(conversions * (1.3 + random() * 0.3));
    const revenue = Math.round(baseRevenue * bucketSize * growth * seasonality * (0.92 + random() * 0.2) * 100) / 100;

    points.push({
      date: date.toISOString(),
      label:
        range === '12m'
          ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visits,
      signups,
      conversions,
      revenue,
      churnRate: Math.round((0.4 + random() * 0.85) * 10_000) / 10_000,
    });
  }

  return points;
}

export function demoOverview(range: MetricRange = '30d'): OverviewResponse {
  const timeseries = buildTimeseries(range);
  const totals = timeseries.reduce(
    (accumulator, point) => ({
      visits: accumulator.visits + point.visits,
      signups: accumulator.signups + point.signups,
      conversions: accumulator.conversions + point.conversions,
      revenue: accumulator.revenue + point.revenue,
      churnedUsers: accumulator.churnedUsers + Math.round(point.signups * point.churnRate),
      avgSessionSeconds: 214,
    }),
    { visits: 0, signups: 0, conversions: 0, revenue: 0, churnedUsers: 0, avgSessionSeconds: 0 },
  );

  const half = Math.floor(timeseries.length / 2);
  const previousTotals = {
    visits: Math.round(totals.visits * 0.88),
    signups: Math.round(totals.signups * 0.91),
    conversions: Math.round(totals.conversions * 0.86),
    revenue: Math.round(totals.revenue * 0.83 * 100) / 100,
    churnedUsers: Math.round(totals.churnedUsers * 1.06),
    avgSessionSeconds: 206,
    conversionRate: Number(((totals.conversions * 0.86 * 100) / Math.max(1, totals.visits * 0.88)).toFixed(2)),
  };

  const conversionRate = Number(((totals.conversions * 100) / Math.max(1, totals.visits)).toFixed(2));
  const churnRate = Number(((totals.churnedUsers * 100) / Math.max(1, totals.signups + totals.churnedUsers)).toFixed(2));

  const percent = (current: number, previous: number): number =>
    previous === 0 ? 0 : Math.round(((current - previous) / previous) * 1000) / 10;

  return {
    range,
    periodStart: new Date(Date.now() - RANGE_DAYS[range] * 86_400_000).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
    totals: { ...totals, conversionRate, churnRate, arpu: Number((totals.revenue / Math.max(1, totals.signups)).toFixed(2)) },
    previousTotals,
    deltas: {
      visits: percent(totals.visits, previousTotals.visits),
      signups: percent(totals.signups, previousTotals.signups),
      revenue: percent(totals.revenue, previousTotals.revenue),
      conversions: percent(totals.conversions, previousTotals.conversions),
      conversionRate: Number((conversionRate - previousTotals.conversionRate).toFixed(2)),
      churnRate: -0.4,
    },
    timeseries,
    statusBreakdown: [
      { status: 'ACTIVE', count: 4, budget: 802_500 },
      { status: 'PLANNING', count: 1, budget: 48_000 },
      { status: 'PAUSED', count: 1, budget: 96_000 },
      { status: 'COMPLETED', count: 2, budget: 159_500 },
      { status: 'ARCHIVED', count: 1, budget: 41_000 },
    ],
    priorityBreakdown: [
      { priority: 'LOW', count: 2 },
      { priority: 'MEDIUM', count: 2 },
      { priority: 'HIGH', count: 3 },
      { priority: 'CRITICAL', count: 2 },
    ],
    topProjects: DEMO_PROJECTS.slice(0, 5).map((project, index) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      revenue: project.metrics?.revenue30d ?? 0,
      visits: project.metrics?.visits30d ?? 0,
      signups: project.metrics?.signups30d ?? 0,
      conversionRate: project.metrics?.conversionRate30d ?? 0,
      progress: project.progress,
      trend: Array.from({ length: 14 }, (_, point) => {
        const random = seededRandom(index * 31 + point * 7 + 3);
        return Math.round(((project.metrics?.revenue30d ?? 10_000) / 30) * (0.85 + random() * 0.35));
      }),
      trendDelta: [18.4, 12.1, 9.6, -4.2, 22.8][index] ?? 5,
    })),
    insights: [
      { tone: 'positive', title: 'Revenue up 20.5%', detail: 'The portfolio cleared $1.14M in the selected window — driven by Atlas and Lumen.' },
      { tone: 'neutral', title: 'Pulse Mobile App leads the portfolio', detail: 'It generated $302,100 across 91,200 sessions.' },
      { tone: 'warning', title: 'Helios Data Warehouse is paused', detail: 'The due date passed 6 days ago and there is no active owner assigned.' },
      { tone: 'positive', title: '4 active projects', detail: 'Average delivery progress sits at 54.6% across the portfolio.' },
    ],
  };
}

export function demoProjectStats(): ProjectStats {
  return {
    total: DEMO_PROJECTS.length,
    byStatus: { PLANNING: 1, ACTIVE: 4, PAUSED: 1, COMPLETED: 2, ARCHIVED: 1 },
    byPriority: { LOW: 2, MEDIUM: 2, HIGH: 3, CRITICAL: 2 },
    totalBudget: 1_147_000,
    averageProgress: 54.6,
    overdue: 1,
    dueSoon: 2,
    completedThisMonth: 1,
  };
}

export function demoActivity(): ActivityEntry[] {
  const templates: Array<[string, string, number]> = [
    ['PROJECT_STATUS_CHANGED', '"Atlas Checkout Revamp" moved from PLANNING to ACTIVE', 0],
    ['PROJECT_UPDATED', 'Budget for "Lumen AI Assistant" increased to $315,000', 0],
    ['USER_LOGGED_IN', 'Demo Analyst signed in from Jakarta, ID', 1],
    ['PROJECT_CREATED', 'Project "Vertex Admin Console" was created', 2],
    ['PROJECT_STATUS_CHANGED', '"Helios Data Warehouse" paused pending vendor review', 3],
    ['PROFILE_UPDATED', 'Maya Prameswari updated their job title', 4],
    ['PROJECT_STATUS_CHANGED', '"Cobalt Billing Migration" marked as completed', 6],
    ['PROJECT_UPDATED', 'Progress on "Orbit Marketing Site" updated to 58%', 7],
  ];

  return templates.map(([action, message, days], index) => ({
    id: `act_${index}`,
    action,
    message,
    createdAt: new Date(Date.now() - days * 86_400_000).toISOString(),
    project: DEMO_PROJECTS[index % DEMO_PROJECTS.length]
      ? {
          id: DEMO_PROJECTS[index % DEMO_PROJECTS.length].id,
          name: DEMO_PROJECTS[index % DEMO_PROJECTS.length].name,
          slug: DEMO_PROJECTS[index % DEMO_PROJECTS.length].slug,
        }
      : null,
    metadata: { demo: true },
  }));
}

export function demoAccountOverview(): AccountOverview {
  return {
    user: DEMO_USER,
    plan: 'Growth',
    stats: {
      projectCount: DEMO_PROJECTS.length,
      activeSessions: 2,
      projectsCreatedLast30Days: 3,
      projectGrowth: 50,
      activeProjects: 4,
      completionRate: 22.2,
    },
    seatUsage: { used: 4, limit: 10 },
    usage: { apiCallsThisMonth: 19_653, storageUsedMb: 76.25 },
    billing: { nextInvoiceDate: daysFromNow(21), amountDue: 107.5, currency: 'USD' },
  };
}

export const demoData = {
  user: DEMO_USER,
  credentials: DEMO_CREDENTIALS,
  projects: DEMO_PROJECTS,
  overview: demoOverview,
  projectStats: demoProjectStats,
  activity: demoActivity,
  account: demoAccountOverview,
};
