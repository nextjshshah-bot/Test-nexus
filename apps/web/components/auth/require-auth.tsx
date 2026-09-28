'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '../ui/primitives';

/**
 * Client-side route guard for the dashboard shell. The API is the real
 * security boundary (every request is token-verified server-side); this only
 * keeps unauthenticated visitors out of the UI.
 */
export function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-7 w-7 text-nexus-400" />
          <p className="text-xs text-slate-500">Restoring your session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default RequireAuth;
