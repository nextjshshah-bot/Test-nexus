import type { Metadata } from 'next';
import AuthForm from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a NexusCore workspace and start tracking delivery and revenue analytics.',
};

export default function RegisterPage(): JSX.Element {
  return (
    <main className="app-backdrop relative flex min-h-screen items-center justify-center px-5 py-12">
      <div className="pointer-events-none absolute -right-32 top-0 h-72 w-72 rounded-full bg-violet2-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-nexus-500/15 blur-3xl" />
      <div className="relative">
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
