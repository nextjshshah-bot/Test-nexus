'use client';

import { useEffect, useState } from 'react';
import { Avatar, Badge, Button } from '../ui/primitives';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeTime } from '@/lib/format';

export function Topbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}): JSX.Element {
  const { user, mode, refresh } = useAuth();
  const [now, setNow] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-100">{title}</h1>
            <Badge className={mode === 'demo' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'} dot={mode === 'demo' ? 'bg-amber-400' : 'bg-emerald-400'}>
              {mode === 'demo' ? 'Demo data' : 'Live API'}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {subtitle ?? `Signed in as ${user?.name ?? 'guest'}`} · {now}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {actions}
          <Button variant="secondary" size="sm" onClick={() => void handleRefresh()} loading={refreshing}>
            {refreshing ? 'Syncing' : 'Sync'}
          </Button>
          <div className="hidden items-center gap-2.5 rounded-xl border border-white/[0.06] bg-ink-850/60 px-2.5 py-1.5 sm:flex">
            <Avatar name={user?.name ?? 'Guest'} url={user?.avatarUrl} size="sm" />
            <div className="leading-tight">
              <p className="text-[11px] font-semibold text-slate-200">{user?.name ?? 'Guest'}</p>
              <p className="text-[10px] text-slate-500">
                Last login {formatRelativeTime(user?.lastLoginAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
