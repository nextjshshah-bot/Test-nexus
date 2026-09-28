'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import Topbar from '@/components/layout/topbar';
import KpiCard from '@/components/dashboard/kpi-card';
import ProjectFormModal from '@/components/projects/project-form-modal';
import DeleteProjectDialog from '@/components/projects/delete-project-dialog';
import { AreaChart } from '@/components/charts/area-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { Badge, Button, Card, ProgressBar, SectionHeader, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { useProject } from '@/lib/hooks';
import { formatCurrency, formatDate, formatNumber, formatPercent, formatRelativeTime } from '@/lib/format';
import { dueDateTone, PRIORITY_STYLES, progressColor, STATUS_STYLES, statusLabel } from '@/lib/status';

export default function ProjectDetailPage({ params }: { params: { id: string } }): JSX.Element {
  const router = useRouter();
  const { push } = useToast();
  const { project, metrics, loading, error, setProject } = useProject(params.id);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const points = metrics?.timeseries ?? [];
  const labels = useMemo(() => points.map((point) => point.label), [points]);

  const handleUpdate = async (payload: Record<string, unknown>) => {
    const updated = await api.projects.update(params.id, payload);
    setProject(updated);
    push({ tone: 'success', title: 'Project updated', description: `${updated.name} was saved.` });
  };

  const handleDelete = async () => {
    await api.projects.remove(params.id);
    push({ tone: 'success', title: 'Project deleted', description: 'Redirecting to your project list…' });
    setTimeout(() => router.push('/dashboard/projects'), 700);
  };

  if (loading && !project) {
    return (
      <>
        <Topbar title="Project" subtitle="Loading project detail…" />
        <main className="flex-1 space-y-5 px-5 py-6 lg:px-7">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </main>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Topbar title="Project not found" subtitle="This project may have been deleted" />
        <main className="flex-1 px-5 py-6 lg:px-7">
          <Card>
            <p className="text-sm text-slate-300">{error ?? 'We could not find that project in your workspace.'}</p>
            <Link href="/dashboard/projects" className="mt-4 inline-block text-xs font-semibold text-nexus-300 hover:text-nexus-200">
              ← Back to projects
            </Link>
          </Card>
        </main>
      </>
    );
  }

  const status = STATUS_STYLES[project.status];
  const priority = PRIORITY_STYLES[project.priority];
  const due = dueDateTone(project.dueDate, project.status);
  const revenueTrend = points.map((point) => point.revenue);
  const visitTrend = points.map((point) => point.visits);

  return (
    <>
      <Topbar
        title={project.name}
        subtitle={`Owner ${project.owner.name} · created ${formatDate(project.createdAt, 'short')} · updated ${formatRelativeTime(project.updatedAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </div>
        }
      />

      <main className="flex-1 space-y-5 px-5 py-6 lg:px-7">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge className={status.badge} dot={status.dot}>
                  {statusLabel(project.status)}
                </Badge>
                <Badge className={priority.badge}>{priority.label} priority</Badge>
                <span className={`text-[11px] font-medium ${due.className}`}>{due.label}</span>
              </div>
              <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-400">
                {project.description ?? 'No description has been provided for this project yet.'}
              </p>
              {project.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="w-full max-w-[260px] space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Delivery progress</span>
                  <span className="font-mono font-semibold text-slate-200">{project.progress}%</span>
                </div>
                <ProgressBar value={project.progress} gradient={progressColor(project.progress)} className="h-2" />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                  <dt className="text-slate-500">Budget</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-100">
                    {formatCurrency(project.budget, { compact: true })}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                  <dt className="text-slate-500">Start</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-100">
                    {formatDate(project.startDate, 'short')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Revenue (30d)"
            value={formatCurrency(metrics?.totals.revenue ?? 0, { compact: true })}
            delta={metrics?.deltas.revenue}
            trend={revenueTrend}
            accent="#608cff"
            icon="$"
          />
          <KpiCard
            label="Sessions (30d)"
            value={formatNumber(metrics?.totals.visits ?? 0, { compact: true })}
            delta={metrics?.deltas.visits}
            trend={visitTrend}
            accent="#34d399"
            icon="◉"
          />
          <KpiCard
            label="Signups"
            value={formatNumber(metrics?.totals.signups ?? 0, { compact: true })}
            delta={metrics?.deltas.signups}
            hint={`${formatCurrency(metrics?.totals.arpu ?? 0)} ARPU`}
            accent="#a78bfa"
            icon="✦"
          />
          <KpiCard
            label="Conversion rate"
            value={formatPercent(metrics?.totals.conversionRate ?? 0, 2)}
            hint={`Churn ${formatPercent(metrics?.totals.churnRate ?? 0, 2)}`}
            accent="#fbbf24"
            icon="◔"
            invertDelta
          />
        </section>

        <Card>
          <SectionHeader
            title="Revenue and sessions"
            subtitle={`${points.length} buckets over the last 30 days`}
            action={
              <span className="font-mono text-[10px] text-slate-600">
                avg session {metrics ? Math.round(metrics.totals.avgSessionSeconds) : 0}s
              </span>
            }
          />
          {points.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500">No metric rows recorded for this project yet.</p>
          ) : (
            <AreaChart
              labels={labels}
              series={[
                { key: 'revenue', label: 'Revenue', color: '#608cff', values: revenueTrend },
                { key: 'visits', label: 'Sessions', color: '#34d399', values: visitTrend },
              ]}
              height={280}
              valueFormatter={(value) => formatNumber(value, { compact: true })}
            />
          )}
        </Card>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card>
            <SectionHeader title="Signups per bucket" subtitle="Activation volume over the window" />
            <BarChart
              data={points.map((point) => ({ label: point.label, value: point.signups, color: '#a78bfa' }))}
              height={220}
              valueFormatter={(value) => formatNumber(value, { compact: true })}
              accent="#a78bfa"
            />
          </Card>

          <Card>
            <SectionHeader title="Conversions per bucket" subtitle="Completed purchases over the window" />
            <BarChart
              data={points.map((point) => ({ label: point.label, value: point.conversions, color: '#fbbf24' }))}
              height={220}
              valueFormatter={(value) => formatNumber(value, { compact: true })}
              accent="#fbbf24"
            />
          </Card>
        </section>
      </main>

      <ProjectFormModal open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleUpdate} project={project} />
      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await handleDelete();
        }}
      />
    </>
  );
}
