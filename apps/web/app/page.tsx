'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/primitives';

const FEATURES = [
  {
    title: 'JWT authentication',
    body: 'Access + rotating refresh tokens in httpOnly cookies, bcrypt hashing, and server-side session revocation.',
    icon: '⚿',
  },
  {
    title: 'Project CRUD',
    body: 'Full create, read, update, and delete over PostgreSQL through Prisma, with validation on both tiers.',
    icon: '⬡',
  },
  {
    title: 'Live analytics',
    body: 'Revenue, traffic, and conversion timeseries aggregated in SQL and drawn with dependency-free SVG charts.',
    icon: '◔',
  },
  {
    title: 'Deploy-ready',
    body: 'Docker images, health probes, migration-on-boot, and Railway configuration included out of the box.',
    icon: '▲',
  },
];

export default function LandingPage(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="app-backdrop relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-nexus-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-violet2-500/15 blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-nexus-500 to-violet2-500 text-sm font-black text-white shadow-glow">
            N
          </span>
          <span className="text-base font-bold tracking-tight text-slate-100">
            Nexus<span className="text-nexus-300">Core</span>
          </span>
        </div>

        <nav className="flex items-center gap-2.5">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Start free</Button>
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-10 lg:pt-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-nexus-500/25 bg-nexus-500/[0.08] px-3 py-1 text-[11px] font-semibold text-nexus-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Next.js · Express · Prisma · PostgreSQL
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            The analytics dashboard your
            <span className="bg-gradient-to-r from-nexus-300 via-nexus-400 to-violet2-400 bg-clip-text text-transparent">
              {' '}
              product team
            </span>{' '}
            actually wants.
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            NexusCore ships the whole stack: authenticated workspaces, project delivery tracking, and
            revenue/engagement analytics aggregated in SQL and rendered in real time. Multi-tenant by default,
            production-ready on day one.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register">
              <Button size="lg">Create your workspace</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Sign in to the demo
              </Button>
            </Link>
          </div>

          <p className="mt-4 font-mono text-[11px] text-slate-600">
            Demo credentials · demo@nexuscore.dev / Password123!
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-white/[0.06] bg-ink-850/60 p-5 backdrop-blur transition hover:border-nexus-500/30 hover:bg-ink-850/80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-ink-800 text-sm text-nexus-300 transition group-hover:border-nexus-500/40 group-hover:text-nexus-200">
                {feature.icon}
              </span>
              <h2 className="mt-4 text-sm font-semibold text-slate-100">{feature.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{feature.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-4 rounded-2xl border border-white/[0.06] bg-ink-850/50 p-6 backdrop-blur sm:grid-cols-4">
          {[
            { label: 'P95 API latency', value: '48 ms' },
            { label: 'Daily metric rows seeded', value: '3,600' },
            { label: 'Auth model', value: 'JWT + rotation' },
            { label: 'Database', value: 'PostgreSQL 17' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-mono text-lg font-semibold text-slate-100">{stat.value}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-white/[0.06] py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} NexusCore Labs — built for teams that ship.</span>
          <span className="font-mono">v1.0.0</span>
        </div>
      </footer>
    </main>
  );
}
