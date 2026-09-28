'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button, Field, Input } from '../ui/primitives';
import { useToast } from '../ui/toast';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { DEMO_CREDENTIALS } from '@/lib/demo-data';

type Mode = 'login' | 'register';

function passwordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function AuthForm({ mode }: { mode: Mode }): JSX.Element {
  const router = useRouter();
  const { login, register, clearError } = useAuth();
  const { push } = useToast();

  const [values, setValues] = useState({
    name: '',
    email: mode === 'login' ? DEMO_CREDENTIALS.email : '',
    password: mode === 'login' ? DEMO_CREDENTIALS.password : '',
    company: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => passwordScore(values.password), [values.password]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();

    const next: Record<string, string> = {};
    if (mode === 'register' && values.name.trim().length < 2) next.name = 'Enter your full name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) next.email = 'Enter a valid email address.';
    if (values.password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (mode === 'register' && !/\d/.test(values.password)) next.password = 'Include at least one number.';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(values.email, values.password);
        push({ tone: 'success', title: 'Welcome back', description: 'Session established. Loading your dashboard…' });
      } else {
        await register({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          company: values.company.trim() || undefined,
        });
        push({ tone: 'success', title: 'Workspace created', description: 'Your NexusCore account is ready.' });
      }
      router.push('/dashboard');
    } catch (caught) {
      if (caught instanceof ApiError) {
        const fieldErrors = caught.fieldErrors();
        setErrors(Object.keys(fieldErrors).length > 0 ? fieldErrors : { email: caught.message });
        push({ tone: 'error', title: 'Authentication failed', description: caught.message });
      } else {
        push({ tone: 'error', title: 'Unexpected error', description: 'Please try again in a moment.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setValues((current) => ({
      ...current,
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
    }));
    setErrors({});
  };

  const strengthLabels = ['very weak', 'weak', 'fair', 'strong', 'excellent'];
  const strengthColors = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];

  return (
    <div className="w-full max-w-md">
      <div className="mb-7 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-nexus-500 to-violet2-500 text-sm font-black text-white shadow-glow">
            N
          </span>
          <span className="text-base font-bold tracking-tight text-slate-100">
            Nexus<span className="text-nexus-300">Core</span>
          </span>
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-50">
          {mode === 'login' ? 'Sign in to your workspace' : 'Create your NexusCore account'}
        </h1>
        <p className="mt-1.5 text-xs text-slate-500">
          {mode === 'login'
            ? 'Use the seeded demo account or your own credentials.'
            : 'Free forever for the first three projects — no credit card required.'}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-white/[0.07] bg-ink-850/80 p-6 shadow-card backdrop-blur"
      >
        {mode === 'register' ? (
          <Field label="Full name" required error={errors.name}>
            <Input
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
          </Field>
        ) : null}

        <Field label="Work email" required error={errors.email}>
          <Input
            type="email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Password" required error={errors.password}>
          <Input
            type="password"
            value={values.password}
            onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
            placeholder="At least 8 characters"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </Field>

        {mode === 'register' ? (
          <>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-full transition ${
                    index < strength ? strengthColors[strength - 1] : 'bg-white/10'
                  }`}
                />
              ))}
              <span className="w-20 text-right text-[10px] font-medium text-slate-500">
                {values.password.length > 0 ? strengthLabels[Math.max(0, strength - 1)] : ''}
              </span>
            </div>

            <Field label="Company" hint="Optional — shown on your workspace.">
              <Input
                value={values.company}
                onChange={(event) => setValues((current) => ({ ...current, company: event.target.value }))}
                placeholder="NexusCore Labs"
                autoComplete="organization"
              />
            </Field>
          </>
        ) : null}

        <Button type="submit" fullWidth loading={submitting} size="lg">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>

        {mode === 'login' ? (
          <button
            type="button"
            onClick={fillDemo}
            className="w-full rounded-xl border border-dashed border-white/12 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:border-nexus-500/40 hover:text-nexus-200"
          >
            Use demo credentials · {DEMO_CREDENTIALS.email}
          </button>
        ) : null}
      </form>

      <p className="mt-5 text-center text-xs text-slate-500">
        {mode === 'login' ? (
          <>
            New to NexusCore?{' '}
            <Link href="/register" className="font-semibold text-nexus-300 hover:text-nexus-200">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-nexus-300 hover:text-nexus-200">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

export default AuthForm;
