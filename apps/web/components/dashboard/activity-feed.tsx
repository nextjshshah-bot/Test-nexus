'use client';

import { Card, EmptyState, SectionHeader, Skeleton } from '../ui/primitives';
import { formatRelativeTime } from '@/lib/format';
import type { ActivityEntry } from '@/lib/types';

const ACTION_META: Record<string, { icon: string; tone: string }> = {
  USER_REGISTERED: { icon: '✦', tone: 'text-violet2-300 border-violet2-500/25 bg-violet2-500/10' },
  USER_LOGGED_IN: { icon: '→', tone: 'text-sky-300 border-sky-500/25 bg-sky-500/10' },
  USER_LOGGED_OUT: { icon: '←', tone: 'text-slate-400 border-slate-500/25 bg-slate-500/10' },
  PASSWORD_CHANGED: { icon: '⚿', tone: 'text-amber-300 border-amber-500/25 bg-amber-500/10' },
  PROFILE_UPDATED: { icon: '✎', tone: 'text-sky-300 border-sky-500/25 bg-sky-500/10' },
  PROJECT_CREATED: { icon: '＋', tone: 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10' },
  PROJECT_UPDATED: { icon: '✎', tone: 'text-nexus-300 border-nexus-500/25 bg-nexus-500/10' },
  PROJECT_DELETED: { icon: '✕', tone: 'text-rose-300 border-rose-500/25 bg-rose-500/10' },
  PROJECT_STATUS_CHANGED: { icon: '⇄', tone: 'text-amber-300 border-amber-500/25 bg-amber-500/10' },
};

export function ActivityFeed({
  entries,
  loading = false,
}: {
  entries: ActivityEntry[];
  loading?: boolean;
}): JSX.Element {
  return (
    <Card className="h-full">
      <SectionHeader
        title="Activity"
        subtitle="Audit trail from your workspace"
        action={<span className="font-mono text-[10px] text-slate-600">{entries.length} events</span>}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="◷"
          title="No activity yet"
          description="Create or update a project and the audit trail will populate here."
        />
      ) : (
        <ol className="relative space-y-3.5">
          <span className="absolute left-[13px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
          {entries.map((entry) => {
            const meta = ACTION_META[entry.action] ?? {
              icon: '•',
              tone: 'text-slate-400 border-slate-500/25 bg-slate-500/10',
            };

            return (
              <li key={entry.id} className="relative flex gap-3">
                <span className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] ${meta.tone}`}>
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed text-slate-300">{entry.message}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
                    <span className="font-mono uppercase tracking-wider">{entry.action.replace(/_/g, ' ')}</span>
                    <span>·</span>
                    <time dateTime={entry.createdAt}>{formatRelativeTime(entry.createdAt)}</time>
                    {entry.project ? (
                      <>
                        <span>·</span>
                        <span className="truncate text-slate-500">{entry.project.name}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

export default ActivityFeed;
