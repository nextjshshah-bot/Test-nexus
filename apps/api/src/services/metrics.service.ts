import { RANGE_TO_DAYS, type METRIC_RANGES } from '../config/constants';
import { prisma } from '../lib/prisma';
import { percentChange, roundTo, toDateOnly, toNumber } from '../utils/serialize';

export type MetricRange = (typeof METRIC_RANGES)[number];

export interface MetricTotals {
  visits: number;
  signups: number;
  conversions: number;
  revenue: number;
  churnedUsers: number;
  avgSessionSeconds: number;
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
  statusBreakdown: Array<{ status: string; count: number; budget: number }>;
  priorityBreakdown: Array<{ priority: string; count: number }>;
  topProjects: Array<{
    id: string;
    name: string;
    status: string;
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function daysForRange(range: MetricRange): number {
  return RANGE_TO_DAYS[range];
}

function emptyTotals(): MetricTotals {
  return { visits: 0, signups: 0, conversions: 0, revenue: 0, churnedUsers: 0, avgSessionSeconds: 0 };
}

function formatLabel(date: Date, range: MetricRange): string {
  if (range === '12m') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  if (range === '90d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function aggregateTotals(
  rows: Array<{
    visits: number;
    signups: number;
    conversions: number;
    revenue: unknown;
    churnedUsers: number;
    avgSessionSeconds: number;
  }>,
): MetricTotals {
  const totals = emptyTotals();
  if (rows.length === 0) return totals;

  for (const row of rows) {
    totals.visits += row.visits;
    totals.signups += row.signups;
    totals.conversions += row.conversions;
    totals.revenue += toNumber(row.revenue as never);
    totals.churnedUsers += row.churnedUsers;
    totals.avgSessionSeconds += row.avgSessionSeconds;
  }

  totals.revenue = roundTo(totals.revenue, 2);
  totals.avgSessionSeconds = Math.round(totals.avgSessionSeconds / rows.length);

  return totals;
}

/** Buckets daily rows into weeks (90d) or months (12m) for readable charts. */
function bucketRows(
  rows: Array<{ date: Date; visits: number; signups: number; conversions: number; revenue: unknown; churnedUsers: number; avgSessionSeconds: number }>,
  range: MetricRange,
): TimeseriesPoint[] {
  const useMonths = range === '12m';
  const bucketSize = useMonths ? 0 : range === '90d' ? 7 : 1;

  const buckets = new Map<string, { anchor: Date; totals: MetricTotals; days: number }>();

  for (const row of rows) {
    const date = new Date(row.date);
    let anchor: Date;

    if (useMonths) {
      anchor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    } else if (bucketSize > 1) {
      const epochDays = Math.floor(startOfUtcDay(date).getTime() / MS_PER_DAY);
      const bucketIndex = Math.floor(epochDays / bucketSize) * bucketSize;
      anchor = new Date(bucketIndex * MS_PER_DAY);
    } else {
      anchor = startOfUtcDay(date);
    }

    const key = anchor.toISOString();
    const bucket = buckets.get(key) ?? { anchor, totals: emptyTotals(), days: 0 };

    bucket.totals.visits += row.visits;
    bucket.totals.signups += row.signups;
    bucket.totals.conversions += row.conversions;
    bucket.totals.revenue += toNumber(row.revenue as never);
    bucket.totals.churnedUsers += row.churnedUsers;
    bucket.totals.avgSessionSeconds += row.avgSessionSeconds;
    bucket.days += 1;

    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .sort((a, b) => a.anchor.getTime() - b.anchor.getTime())
    .map((bucket) => ({
      date: bucket.anchor.toISOString(),
      label: formatLabel(bucket.anchor, range),
      visits: bucket.totals.visits,
      signups: bucket.totals.signups,
      conversions: bucket.totals.conversions,
      revenue: roundTo(bucket.totals.revenue, 2),
      churnRate: roundTo(
        bucket.days === 0 ? 0 : bucket.totals.churnedUsers / Math.max(1, bucket.totals.signups + bucket.totals.churnedUsers),
        4,
      ),
    }));
}

export async function getMetricRows(userId: string, range: MetricRange, projectId?: string) {
  const end = startOfUtcDay(new Date());
  const start = new Date(end.getTime() - (daysForRange(range) - 1) * MS_PER_DAY);
  const previousStart = new Date(start.getTime() - daysForRange(range) * MS_PER_DAY);

  const baseWhere = {
    ...(projectId ? { projectId } : {}),
    project: { ownerId: userId },
  };

  const [current, previous] = await Promise.all([
    prisma.dailyMetric.findMany({
      where: { ...baseWhere, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
    prisma.dailyMetric.findMany({
      where: { ...baseWhere, date: { gte: previousStart, lt: start } },
    }),
  ]);

  return { current, previous, start, end, previousStart };
}

export async function getOverview(
  userId: string,
  range: MetricRange,
  projectId?: string,
): Promise<OverviewResponse> {
  const { current, previous, start, end } = await getMetricRows(userId, range, projectId);

  const totals = aggregateTotals(current);
  const previousTotals = aggregateTotals(previous);

  const conversionRate = roundTo(totals.visits === 0 ? 0 : (totals.conversions / totals.visits) * 100, 2);
  const previousConversionRate = roundTo(
    previousTotals.visits === 0 ? 0 : (previousTotals.conversions / previousTotals.visits) * 100,
    2,
  );
  const churnRate = roundTo(
    totals.signups + totals.churnedUsers === 0
      ? 0
      : (totals.churnedUsers / (totals.signups + totals.churnedUsers)) * 100,
    2,
  );
  const previousChurnRate = roundTo(
    previousTotals.signups + previousTotals.churnedUsers === 0
      ? 0
      : (previousTotals.churnedUsers / (previousTotals.signups + previousTotals.churnedUsers)) * 100,
    2,
  );

  const revenueByProject = new Map<string, number>();
  const visitsByProject = new Map<string, number>();
  const signupsByProject = new Map<string, number>();
  const trendByProject = new Map<string, number[]>();

  for (const row of current) {
    revenueByProject.set(row.projectId, (revenueByProject.get(row.projectId) ?? 0) + toNumber(row.revenue));
    visitsByProject.set(row.projectId, (visitsByProject.get(row.projectId) ?? 0) + row.visits);
    signupsByProject.set(row.projectId, (signupsByProject.get(row.projectId) ?? 0) + row.signups);
    const trend = trendByProject.get(row.projectId) ?? [];
    trend.push(roundTo(toNumber(row.revenue), 2));
    trendByProject.set(row.projectId, trend);
  }

  const [statusGroups, priorityGroups, projects] = await Promise.all([
    prisma.project.groupBy({
      by: ['status'],
      where: { ownerId: userId },
      _count: { _all: true },
      _sum: { budget: true },
    }),
    prisma.project.groupBy({ by: ['priority'], where: { ownerId: userId }, _count: { _all: true } }),
    prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, status: true, progress: true },
    }),
  ]);

  const projectLookup = new Map(projects.map((project) => [project.id, project]));

  const conversionsByProject = new Map<string, number>();
  for (const row of current) {
    conversionsByProject.set(row.projectId, (conversionsByProject.get(row.projectId) ?? 0) + row.conversions);
  }

  const topProjects: OverviewResponse['topProjects'] = [...revenueByProject.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, revenue]) => {
      const project = projectLookup.get(id);
      const visits = visitsByProject.get(id) ?? 0;
      const conversions = conversionsByProject.get(id) ?? 0;
      const fullTrend = trendByProject.get(id) ?? [];
      const trend = fullTrend.length > 0 ? fullTrend.slice(-14) : [0, 0, 0, 0, 0];
      const half = Math.max(1, Math.floor(trend.length / 2));
      const firstHalf = trend.slice(0, half).reduce((sum, value) => sum + value, 0);
      const secondHalf = trend.slice(-half).reduce((sum, value) => sum + value, 0);

      return {
        id,
        name: project?.name ?? 'Unknown project',
        status: project?.status ?? 'PLANNING',
        revenue: roundTo(revenue, 2),
        visits,
        signups: signupsByProject.get(id) ?? 0,
        conversionRate: roundTo(visits === 0 ? 0 : (conversions / visits) * 100, 2),
        progress: project?.progress ?? 0,
        trend,
        trendDelta: percentChange(secondHalf, firstHalf),
      };
    });

  const deltas = {
    visits: percentChange(totals.visits, previousTotals.visits),
    signups: percentChange(totals.signups, previousTotals.signups),
    revenue: percentChange(totals.revenue, previousTotals.revenue),
    conversions: percentChange(totals.conversions, previousTotals.conversions),
    conversionRate: roundTo(conversionRate - previousConversionRate, 2),
    churnRate: roundTo(churnRate - previousChurnRate, 2),
  };

  const insights: OverviewResponse['insights'] = [];

  if (deltas.revenue > 0) {
    insights.push({
      tone: 'positive',
      title: `Revenue up ${Math.abs(deltas.revenue)}%`,
      detail: `Revenue reached $${totals.revenue.toLocaleString('en-US')} for the selected ${range} window.`,
    });
  } else if (deltas.revenue < 0) {
    insights.push({
      tone: 'warning',
      title: `Revenue down ${Math.abs(deltas.revenue)}%`,
      detail: 'Consider reviewing pricing experiments and top-of-funnel campaigns.',
    });
  }

  if (topProjects.length > 0) {
    insights.push({
      tone: 'neutral',
      title: `${topProjects[0].name} leads the portfolio`,
      detail: `It generated $${topProjects[0].revenue.toLocaleString('en-US')} across ${topProjects[0].visits.toLocaleString('en-US')} sessions.`,
    });
  }

  if (totals.visits > 0 && conversionRate < 2) {
    insights.push({
      tone: 'warning',
      title: 'Conversion rate below 2%',
      detail: 'Traffic is healthy but signup friction may be limiting activation.',
    });
  }

  if (insights.length < 3 && projects.length > 0) {
    const activeCount = statusGroups.find((group) => group.status === 'ACTIVE')?._count._all ?? 0;
    insights.push({
      tone: 'neutral',
      title: `${activeCount} active project${activeCount === 1 ? '' : 's'}`,
      detail: `Average delivery progress sits at ${roundTo(
        projects.reduce((sum, project) => sum + project.progress, 0) / projects.length,
        1,
      )}%.`,
    });
  }

  return {
    range,
    periodStart: toDateOnly(start),
    periodEnd: toDateOnly(end),
    totals: {
      ...totals,
      conversionRate,
      churnRate,
      arpu: roundTo(totals.signups === 0 ? 0 : totals.revenue / totals.signups, 2),
    },
    previousTotals: { ...previousTotals, conversionRate: previousConversionRate },
    deltas,
    timeseries: bucketRows(current, range),
    statusBreakdown: statusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
      budget: roundTo(toNumber(group._sum.budget), 2),
    })),
    priorityBreakdown: priorityGroups.map((group) => ({
      priority: group.priority,
      count: group._count._all,
    })),
    topProjects,
    insights: insights.slice(0, 4),
  };
}

export async function getTimeseries(
  userId: string,
  range: MetricRange,
  projectId?: string,
): Promise<{ range: MetricRange; points: TimeseriesPoint[] }> {
  const { current } = await getMetricRows(userId, range, projectId);
  return { range, points: bucketRows(current, range) };
}

export async function getProjectMetrics(userId: string, projectId: string, range: MetricRange) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true, name: true },
  });

  if (!project) return null;

  const { current, previous } = await getMetricRows(userId, range, projectId);
  const totals = aggregateTotals(current);
  const previousTotals = aggregateTotals(previous);

  return {
    project,
    range,
    totals: {
      ...totals,
      conversionRate: roundTo(totals.visits === 0 ? 0 : (totals.conversions / totals.visits) * 100, 2),
    },
    deltas: {
      visits: percentChange(totals.visits, previousTotals.visits),
      signups: percentChange(totals.signups, previousTotals.signups),
      revenue: percentChange(totals.revenue, previousTotals.revenue),
    },
    timeseries: bucketRows(current, range),
  };
}

export const metricsService = { getOverview, getTimeseries, getProjectMetrics };
