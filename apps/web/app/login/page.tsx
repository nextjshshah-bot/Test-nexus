import type { Metadata } from 'next';
import AuthForm from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your NexusCore analytics workspace.',
};

export default function LoginPage(): JSX.Element {
  return (
    <main className="app-backdrop relative flex min-h-screen items-center justify-center px-5 py-12">
      <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-nexus-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-violet2-500/15 blur-3xl" />
      <div className="relative">
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
