'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Avatar } from '../ui/primitives';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: JSX.Element;
  badge?: string;
  exact?: boolean;
}

function Icon({ path }: { path: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', exact: true, icon: <Icon path="M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-12h8V3h-8v6z" /> },
  { href: '/dashboard/projects', label: 'Projects', icon: <Icon path="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /> },
  { href: '/dashboard/analytics', label: 'Analytics', icon: <Icon path="M4 19V5m5 14V9m5 10v-6m5 6V7" /> },
  { href: '/dashboard/settings', label: 'Settings', icon: <Icon path="M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7.3 7.3 0 00-2-1.2L14.6 3H9.4l-.4 2.7c-.7.3-1.4.7-2 1.2l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 000 2.4l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.7h5.2l.4-2.7c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" /> },
];

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const { user, mode, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? 'bg-nexus-500/12 text-nexus-100 ring-1 ring-inset ring-nexus-500/25'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <span className={active ? 'text-nexus-300' : 'text-slate-500 group-hover:text-slate-300'}>{item.icon}</span>
            {item.label}
            {item.badge ? (
              <span className="ml-auto rounded-full bg-nexus-500/20 px-1.5 py-0.5 text-[10px] font-bold text-nexus-200">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const panel = (
    <div className="flex h-full flex-col gap-6 border-r border-white/[0.06] bg-ink-900/80 px-4 py-5 backdrop-blur">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-1" onClick={() => setMobileOpen(false)}>
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-nexus-500 to-violet2-500 text-sm font-black text-white shadow-glow">
          N
        </span>
        <span className="text-sm font-bold tracking-tight text-slate-100">
          Nexus<span className="text-nexus-300">Core</span>
        </span>
      </Link>

      {nav}

      <div className="space-y-3">
        {mode === 'demo' ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3">
            <p className="text-[11px] font-semibold text-amber-200">Demo dataset</p>
            <p className="mt-1 text-[10px] leading-relaxed text-amber-200/70">
              The API is unreachable, so bundled sample data is on screen. Changes are not persisted.
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border border-white/[0.06] bg-ink-850/60 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.name ?? 'Guest'} url={user?.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">{user?.name ?? 'Signed out'}</p>
              <p className="truncate text-[10px] text-slate-500">{user?.email ?? '—'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 w-full rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-5 left-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-ink-800 text-slate-200 shadow-card lg:hidden"
        aria-label="Open navigation"
      >
        ☰
      </button>

      <aside className="hidden w-[248px] shrink-0 lg:block">
        <div className="sticky top-0 h-screen">{panel}</div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[262px]">{panel}</div>
        </div>
      ) : null}
    </>
  );
}

export default Sidebar;
