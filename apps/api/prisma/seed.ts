/**
 * ---------------------------------------------------------------------------
 * NexusCore database seed
 * ---------------------------------------------------------------------------
 * Creates a demo account, a portfolio of projects, and 400 days of daily
 * metrics so every dashboard widget has realistic data to render.
 *
 *   npm run db:seed --workspace @nexuscore/api
 */
import { PrismaClient, Prisma, type ProjectStatus, type Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.SEED_EMAIL ?? 'demo@nexuscore.dev';
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'Password123!';
const METRIC_DAYS = 400;

interface SeedProject {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  budget: number;
  progress: number;
  tags: string[];
  startOffsetDays: number;
  dueOffsetDays: number;
  /** Baseline traffic this project receives per day. */
  visitBase: number;
  growth: number;
  conversionRate: number;
  arpu: number;
  churnRate: number;
}

const SEED_PROJECTS: SeedProject[] = [
  {
    name: 'Atlas Checkout Revamp',
    description: 'Rebuild the multi-step checkout flow with saved payment methods and a one-tap upsell engine.',
    status: 'ACTIVE',
    priority: 'CRITICAL',
    budget: 184_000,
    progress: 72,
    tags: ['payments', 'experiment', 'q4'],
    startOffsetDays: 120,
    dueOffsetDays: 24,
    visitBase: 4200,
    growth: 0.009,
    conversionRate: 0.041,
    arpu: 48,
    churnRate: 0.006,
  },
  {
    name: 'Orbit Marketing Site',
    description: 'Programmatic landing pages with A/B variant routing and a headless CMS pipeline.',
    status: 'ACTIVE',
    priority: 'HIGH',
    budget: 62_500,
    progress: 58,
    tags: ['marketing', 'seo'],
    startOffsetDays: 90,
    dueOffsetDays: 41,
    visitBase: 6100,
    growth: 0.012,
    conversionRate: 0.028,
    arpu: 32,
    churnRate: 0.004,
  },
  {
    name: 'Pulse Mobile App',
    description: 'React Native companion app with push notifications, offline cache, and biometric login.',
    status: 'ACTIVE',
    priority: 'HIGH',
    budget: 241_000,
    progress: 44,
    tags: ['mobile', 'react-native'],
    startOffsetDays: 60,
    dueOffsetDays: 96,
    visitBase: 3050,
    growth: 0.015,
    conversionRate: 0.052,
    arpu: 64,
    churnRate: 0.011,
  },
  {
    name: 'Helios Data Warehouse',
    description: 'Consolidate event streams into a warehouse with dbt models and daily reconciliation jobs.',
    status: 'PAUSED',
    priority: 'MEDIUM',
    budget: 96_000,
    progress: 35,
    tags: ['data', 'infrastructure'],
    startOffsetDays: 200,
    dueOffsetDays: -6,
    visitBase: 520,
    growth: 0.002,
    conversionRate: 0.018,
    arpu: 210,
    churnRate: 0.002,
  },
  {
    name: 'Vertex Admin Console',
    description: 'Internal operations console with role-based access, audit trails, and bulk workflows.',
    status: 'PLANNING',
    priority: 'MEDIUM',
    budget: 48_000,
    progress: 12,
    tags: ['internal', 'rbac'],
    startOffsetDays: 18,
    dueOffsetDays: 150,
    visitBase: 380,
    growth: 0.004,
    conversionRate: 0.061,
    arpu: 96,
    churnRate: 0.001,
  },
  {
    name: 'Lumen AI Assistant',
    description: 'Embedded assistant that summarises account activity and drafts follow-up sequences.',
    status: 'ACTIVE',
    priority: 'CRITICAL',
    budget: 315_000,
    progress: 61,
    tags: ['ai', 'llm', 'growth'],
    startOffsetDays: 75,
    dueOffsetDays: 58,
    visitBase: 2400,
    growth: 0.021,
    conversionRate: 0.033,
    arpu: 118,
    churnRate: 0.009,
  },
  {
    name: 'Cobalt Billing Migration',
    description: 'Move legacy invoices to metered billing with proration and dunning automation.',
    status: 'COMPLETED',
    priority: 'HIGH',
    budget: 132_000,
    progress: 100,
    tags: ['billing', 'migration'],
    startOffsetDays: 320,
    dueOffsetDays: -45,
    visitBase: 900,
    growth: 0.003,
    conversionRate: 0.045,
    arpu: 240,
    churnRate: 0.003,
  },
  {
    name: 'Nimbus CDN Rollout',
    description: 'Edge caching and image optimisation across three regions to cut p75 TTFB.',
    status: 'COMPLETED',
    priority: 'LOW',
    budget: 27_500,
    progress: 100,
    tags: ['performance', 'edge'],
    startOffsetDays: 260,
    dueOffsetDays: -120,
    visitBase: 1450,
    growth: 0.001,
    conversionRate: 0.022,
    arpu: 18,
    churnRate: 0.002,
  },
  {
    name: 'Quartz Partner Portal',
    description: 'Self-serve partner onboarding, revenue share reporting, and co-marketing assets.',
    status: 'ARCHIVED',
    priority: 'LOW',
    budget: 41_000,
    progress: 88,
    tags: ['partners', 'legacy'],
    startOffsetDays: 400,
    dueOffsetDays: -180,
    visitBase: 260,
    growth: -0.002,
    conversionRate: 0.026,
    arpu: 76,
    churnRate: 0.005,
  },
];

const SECOND_USER_PROJECTS: Array<Pick<SeedProject, 'name' | 'status' | 'priority' | 'budget' | 'progress' | 'tags'>> = [
  {
    name: 'Aurora Growth Experiments',
    status: 'ACTIVE',
    priority: 'HIGH',
    budget: 74_000,
    progress: 39,
    tags: ['growth', 'experiments'],
  },
  {
    name: 'Zenith Design System',
    status: 'PLANNING',
    priority: 'MEDIUM',
    budget: 33_500,
    progress: 8,
    tags: ['design', 'tokens'],
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfUtcDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

/** Deterministic pseudo-random generator so seeds are reproducible. */
function createRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

async function clearDemoData(userIds: string[]): Promise<void> {
  await prisma.activityLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.dailyMetric.deleteMany({ where: { project: { ownerId: { in: userIds } } } });
  await prisma.project.deleteMany({ where: { ownerId: { in: userIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('\n🌱  NexusCore seed starting...\n');

  // -------------------------------------------------------------------------
  // 1. Users
  // -------------------------------------------------------------------------
  const existingDemo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existingDemo) {
    console.log(`↻  Removing previous demo data for ${DEMO_EMAIL}`);
    await clearDemoData([existingDemo.id]);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const demoUser = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: 'Demo Analyst',
      passwordHash,
      role: 'ADMIN',
      company: 'NexusCore Labs',
      jobTitle: 'Head of Product Analytics',
      lastLoginAt: new Date(),
    },
  });

  const teammate = await prisma.user.create({
    data: {
      email: 'maya@nexuscore.dev',
      name: 'Maya Prameswari',
      passwordHash,
      role: 'USER',
      company: 'NexusCore Labs',
      jobTitle: 'Growth Engineer',
      lastLoginAt: addDays(new Date(), -1),
    },
  });

  console.log(`✓  Users: ${demoUser.email} (admin), ${teammate.email}`);

  // -------------------------------------------------------------------------
  // 2. Projects
  // -------------------------------------------------------------------------
  const today = startOfUtcDay(new Date());
  const createdProjects: Array<{ id: string; name: string; spec: SeedProject }> = [];

  for (const spec of SEED_PROJECTS) {
    const project = await prisma.project.create({
      data: {
        name: spec.name,
        slug: slugify(spec.name),
        description: spec.description,
        status: spec.status,
        priority: spec.priority,
        ownerId: demoUser.id,
        budget: new Prisma.Decimal(spec.budget),
        progress: spec.progress,
        tags: spec.tags,
        startDate: addDays(today, -spec.startOffsetDays),
        dueDate: addDays(today, spec.dueOffsetDays),
        archivedAt: spec.status === 'ARCHIVED' ? addDays(today, -150) : null,
        createdAt: addDays(today, -spec.startOffsetDays),
      },
    });

    createdProjects.push({ id: project.id, name: project.name, spec });
  }

  for (const spec of SECOND_USER_PROJECTS) {
    await prisma.project.create({
      data: {
        name: spec.name,
        slug: slugify(spec.name),
        description: `${spec.name} — owned by Maya Prameswari.`,
        status: spec.status,
        priority: spec.priority,
        ownerId: teammate.id,
        budget: new Prisma.Decimal(spec.budget),
        progress: spec.progress,
        tags: spec.tags,
        startDate: addDays(today, -45),
        dueDate: addDays(today, 120),
        createdAt: addDays(today, -45),
      },
    });
  }

  console.log(`✓  Projects: ${createdProjects.length} for demo user, ${SECOND_USER_PROJECTS.length} for teammate`);

  // -------------------------------------------------------------------------
  // 3. Daily metrics — 400 days per project with weekday seasonality
  // -------------------------------------------------------------------------
  await prisma.dailyMetric.deleteMany({ where: { projectId: { in: createdProjects.map((p) => p.id) } } });

  let metricRows = 0;

  for (const [index, project] of createdProjects.entries()) {
    const random = createRandom(1337 + index * 97);
    const rows: Prisma.DailyMetricCreateManyInput[] = [];

    for (let dayOffset = METRIC_DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
      const date = addDays(today, -dayOffset);
      const dayOfWeek = date.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const yearIndex = (METRIC_DAYS - 1 - dayOffset) / METRIC_DAYS;
      const growthFactor = 1 + project.spec.growth * (METRIC_DAYS - 1 - dayOffset);
      const weeklyFactor = isWeekend ? 0.62 : 1;
      const seasonality =
        0.88 +
        0.24 * Math.sin((2 * Math.PI * (METRIC_DAYS - dayOffset)) / 30) +
        0.06 * Math.cos((2 * Math.PI * (METRIC_DAYS - dayOffset)) / 7);

      // Archived/completed projects fade out toward the present.
      const lifecycle =
        project.spec.status === 'ARCHIVED'
          ? 1 - 0.55 * yearIndex
          : project.spec.status === 'COMPLETED'
            ? 1 - 0.3 * yearIndex
            : project.spec.status === 'PLANNING'
              ? 0.15 + 0.85 * yearIndex
              : 1;

      const noise = 0.85 + random() * 0.3;

      const visits = Math.max(
        3,
        Math.round(project.spec.visitBase * growthFactor * weeklyFactor * seasonality * lifecycle * noise),
      );

      const conversionNoise = 0.85 + random() * 0.3;
      const conversions = Math.max(0, Math.round(visits * project.spec.conversionRate * conversionNoise));
      const signups = Math.max(conversions, Math.round(conversions * (1.35 + random() * 0.4)));
      const churnedUsers = Math.max(0, Math.round(signups * project.spec.churnRate * (0.6 + random() * 0.8)));
      const revenue = Number((conversions * project.spec.arpu * (0.9 + random() * 0.2)).toFixed(2));
      const avgSessionSeconds = Math.round(95 + random() * 210 + (isWeekend ? 25 : 0));

      rows.push({
        projectId: project.id,
        date,
        visits,
        signups,
        conversions,
        revenue: new Prisma.Decimal(revenue),
        churnedUsers,
        avgSessionSeconds,
      });
    }

    await prisma.dailyMetric.createMany({ data: rows });
    metricRows += rows.length;
  }

  console.log(`✓  Daily metrics: ${metricRows.toLocaleString('en-US')} rows across ${METRIC_DAYS} days`);

  // -------------------------------------------------------------------------
  // 4. Activity feed
  // -------------------------------------------------------------------------
  const activityTemplates: Array<{ action: Prisma.ActivityLogCreateManyInput['action']; message: string; days: number }> = [
    { action: 'PROJECT_STATUS_CHANGED', message: '"Atlas Checkout Revamp" moved from PLANNING to ACTIVE', days: 0 },
    { action: 'PROJECT_UPDATED', message: 'Budget for "Lumen AI Assistant" increased to $315,000', days: 0 },
    { action: 'USER_LOGGED_IN', message: 'Demo Analyst signed in from Jakarta, ID', days: 1 },
    { action: 'PROJECT_CREATED', message: 'Project "Vertex Admin Console" was created', days: 2 },
    { action: 'PROJECT_STATUS_CHANGED', message: '"Helios Data Warehouse" paused pending vendor review', days: 3 },
    { action: 'PROFILE_UPDATED', message: 'Maya Prameswari updated their job title', days: 4 },
    { action: 'PROJECT_STATUS_CHANGED', message: '"Cobalt Billing Migration" marked as completed', days: 6 },
    { action: 'PROJECT_UPDATED', message: 'Progress on "Orbit Marketing Site" updated to 58%', days: 7 },
    { action: 'USER_REGISTERED', message: 'Maya Prameswari joined the NexusCore workspace', days: 9 },
    { action: 'PASSWORD_CHANGED', message: 'Demo Analyst rotated their password', days: 12 },
  ];

  await prisma.activityLog.deleteMany({ where: { userId: demoUser.id } });

  await prisma.activityLog.createMany({
    data: activityTemplates.map((template, index) => ({
      action: template.action,
      message: template.message,
      userId: demoUser.id,
      projectId: createdProjects[index % createdProjects.length]?.id ?? null,
      metadata: { source: 'seed', sequence: index + 1 } as Prisma.InputJsonValue,
      createdAt: addDays(new Date(), -template.days),
    })),
  });

  console.log(`✓  Activity log: ${activityTemplates.length} entries`);

  // -------------------------------------------------------------------------
  // 5. Summary
  // -------------------------------------------------------------------------
  const [userCount, projectCount, finalMetricCount] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.dailyMetric.count(),
  ]);

  console.log('\n──────────────────────────────────────────────────────────');
  console.log('  NexusCore seed complete');
  console.log('──────────────────────────────────────────────────────────');
  console.log(`  Users          : ${userCount}`);
  console.log(`  Projects       : ${projectCount}`);
  console.log(`  Daily metrics  : ${finalMetricCount.toLocaleString('en-US')}`);
  console.log('  Demo login     : ' + DEMO_EMAIL);
  console.log('  Demo password  : ' + DEMO_PASSWORD);
  console.log(`  Duration       : ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log('──────────────────────────────────────────────────────────\n');
}

main()
  .catch((error) => {
    console.error('❌  Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
