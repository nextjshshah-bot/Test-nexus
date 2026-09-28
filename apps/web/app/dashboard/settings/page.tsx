'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/topbar';
import { Avatar, Badge, Button, Card, Field, Input, SectionHeader, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { formatBytes, formatCurrency, formatDate, formatNumber, formatRelativeTime } from '@/lib/format';
import type { SessionEntry } from '@/lib/types';

export default function SettingsPage(): JSX.Element {
  const { user, account, mode, refresh, updateUser, logout } = useAuth();
  const { push } = useToast();

  const [profile, setProfile] = useState({ name: '', company: '', jobTitle: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (!user) return;
    setProfile({ name: user.name, company: user.company ?? '', jobTitle: user.jobTitle ?? '' });
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadingSessions(true);
      if (mode === 'demo') {
        if (!cancelled) {
          setSessions([
            {
              id: 'demo-session-1',
              userAgent: 'Chrome on macOS — Jakarta, ID',
              ipAddress: '103.28.14.72',
              createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
              expiresAt: new Date(Date.now() + 29 * 86_400_000).toISOString(),
            },
          ]);
          setLoadingSessions(false);
        }
        return;
      }

      try {
        const result = await api.auth.sessions();
        if (!cancelled) setSessions(result);
      } catch {
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);

    try {
      if (mode === 'demo') {
        updateUser({ ...(user as NonNullable<typeof user>), ...profile, company: profile.company, jobTitle: profile.jobTitle });
        push({ tone: 'info', title: 'Demo mode', description: 'Profile edits are local-only while the API is offline.' });
        return;
      }

      const updated = await api.auth.updateProfile({
        name: profile.name,
        company: profile.company === '' ? null : profile.company,
        jobTitle: profile.jobTitle === '' ? null : profile.jobTitle,
      });
      updateUser(updated);
      await refresh();
      push({ tone: 'success', title: 'Profile saved', description: 'Your details were updated.' });
    } catch (caught) {
      push({
        tone: 'error',
        title: 'Could not save profile',
        description: caught instanceof ApiError ? caught.message : 'Unexpected error.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingPassword(true);

    try {
      if (mode === 'demo') {
        push({ tone: 'info', title: 'Demo mode', description: 'Password changes require the live API.' });
        return;
      }

      await api.auth.changePassword(password);
      push({
        tone: 'success',
        title: 'Password updated',
        description: 'All sessions were revoked. Please sign in again.',
      });
      setPassword({ currentPassword: '', newPassword: '' });
      setTimeout(() => void logout(), 1200);
    } catch (caught) {
      push({
        tone: 'error',
        title: 'Could not change password',
        description: caught instanceof ApiError ? caught.message : 'Unexpected error.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const revokeSessions = async () => {
    if (mode === 'demo') {
      setSessions([]);
      push({ tone: 'info', title: 'Demo mode', description: 'Session revocation requires the live API.' });
      return;
    }

    try {
      await api.auth.revokeAllSessions();
      push({ tone: 'success', title: 'Sessions revoked', description: 'You have been signed out everywhere.' });
      await logout();
    } catch {
      push({ tone: 'error', title: 'Revoke failed', description: 'Please retry in a moment.' });
    }
  };

  return (
    <>
      <Topbar title="Settings" subtitle="Profile, security, and workspace usage" />

      <main className="flex-1 space-y-5 px-5 py-6 lg:px-7">
        <section className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          <Card>
            <SectionHeader title="Profile" subtitle="Displayed across your workspace and activity log" />
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar name={user?.name ?? 'Guest'} url={user?.avatarUrl} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={user?.role === 'ADMIN' ? 'border-violet2-500/25 bg-violet2-500/10 text-violet2-300' : 'border-white/10 bg-white/5 text-slate-300'}>
                      {user?.role ?? 'USER'}
                    </Badge>
                    <span className="text-[11px] text-slate-500">Joined {formatDate(user?.createdAt)}</span>
                  </div>
                </div>
              </div>

              <Field label="Full name" required>
                <Input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company">
                  <Input
                    value={profile.company}
                    onChange={(event) => setProfile((current) => ({ ...current, company: event.target.value }))}
                    placeholder="NexusCore Labs"
                  />
                </Field>
                <Field label="Job title">
                  <Input
                    value={profile.jobTitle}
                    onChange={(event) => setProfile((current) => ({ ...current, jobTitle: event.target.value }))}
                    placeholder="Head of Analytics"
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={savingProfile}>
                  Save profile
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-5">
            <Card>
              <SectionHeader title="Password" subtitle="Changing it signs you out of every device" />
              <form onSubmit={savePassword} className="space-y-4">
                <Field label="Current password" required>
                  <Input
                    type="password"
                    value={password.currentPassword}
                    onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))}
                    autoComplete="current-password"
                  />
                </Field>
                <Field label="New password" required hint="Minimum 8 characters with at least one number.">
                  <Input
                    type="password"
                    value={password.newPassword}
                    onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))}
                    autoComplete="new-password"
                  />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" variant="secondary" loading={savingPassword}>
                    Update password
                  </Button>
                </div>
              </form>
            </Card>

            <Card>
              <SectionHeader
                title="Active sessions"
                subtitle="Refresh tokens currently able to mint access tokens"
                action={
                  <Button size="sm" variant="ghost" className="text-rose-300 hover:bg-rose-500/10" onClick={() => void revokeSessions()}>
                    Revoke all
                  </Button>
                }
              />

              {loadingSessions ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-slate-500">No active sessions recorded.</p>
              ) : (
                <ul className="space-y-2.5">
                  {sessions.map((session) => (
                    <li key={session.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="truncate text-[11px] font-medium text-slate-300">
                        {session.userAgent ?? 'Unknown client'}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-500">
                        <span>{session.ipAddress ?? 'unknown IP'}</span>
                        <span>·</span>
                        <span>started {formatRelativeTime(session.createdAt)}</span>
                        <span>·</span>
                        <span>expires {formatDate(session.expiresAt, 'short')}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <Card>
            <SectionHeader title="Plan & seats" subtitle="Simulated billing metadata" />
            {account ? (
              <>
                <p className="font-mono text-2xl font-semibold text-slate-100">{account.plan}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {account.seatUsage.used} of {account.seatUsage.limit} seats used · next invoice{' '}
                  {formatDate(account.billing.nextInvoiceDate, 'short')}
                </p>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-nexus-400 to-violet2-400"
                    style={{ width: `${Math.min(100, (account.seatUsage.used / account.seatUsage.limit) * 100)}%` }}
                  />
                </div>
                <p className="mt-3 font-mono text-sm text-slate-300">
                  {formatCurrency(account.billing.amountDue)} {account.billing.currency} due
                </p>
              </>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </Card>

          <Card>
            <SectionHeader title="Usage" subtitle="Rolling 30-day consumption" />
            {account ? (
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-slate-400">API calls</dt>
                  <dd className="font-mono text-xs font-semibold text-slate-100">
                    {formatNumber(account.usage.apiCallsThisMonth)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-slate-400">Storage</dt>
                  <dd className="font-mono text-xs font-semibold text-slate-100">{formatBytes(account.usage.storageUsedMb)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-slate-400">Projects tracked</dt>
                  <dd className="font-mono text-xs font-semibold text-slate-100">{account.stats.projectCount}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-slate-400">Completion rate</dt>
                  <dd className="font-mono text-xs font-semibold text-slate-100">{account.stats.completionRate}%</dd>
                </div>
              </dl>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </Card>

          <Card>
            <SectionHeader title="Danger zone" subtitle="Irreversible workspace actions" />
            <p className="text-xs leading-relaxed text-slate-500">
              Signing out revokes the refresh token stored in your browser. Revoking all sessions additionally kills every
              other device, including any open API clients.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button variant="secondary" size="sm" onClick={() => void logout()}>
                Sign out
              </Button>
              <Button variant="danger" size="sm" onClick={() => void revokeSessions()}>
                Revoke all sessions
              </Button>
            </div>
          </Card>
        </section>
      </main>
    </>
  );
}
