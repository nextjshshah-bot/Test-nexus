'use client';

import Sidebar from '@/components/layout/sidebar';
import RequireAuth from '@/components/auth/require-auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <RequireAuth>
      <div className="relative flex min-h-screen bg-ink-950">
        <div
          className="pointer-events-none fixed inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 8% -10%, rgba(59,102,245,0.16), transparent 45%), radial-gradient(circle at 92% 4%, rgba(139,92,246,0.12), transparent 42%)',
          }}
        />
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </RequireAuth>
  );
}
