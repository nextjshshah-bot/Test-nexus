import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui/toast';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'NexusCore';

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — SaaS Analytics Dashboard`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    'NexusCore is a production-ready SaaS analytics dashboard: JWT authentication, project CRUD, and live data visualisation on Next.js, Express, Prisma, and PostgreSQL.',
  applicationName: APP_NAME,
  keywords: ['analytics', 'dashboard', 'SaaS', 'Next.js', 'Express', 'Prisma', 'PostgreSQL'],
  authors: [{ name: 'NexusCore Labs' }],
  openGraph: {
    title: `${APP_NAME} — SaaS Analytics Dashboard`,
    description: 'Project delivery and revenue analytics for modern product teams.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#05070f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
