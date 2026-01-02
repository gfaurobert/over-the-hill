import './globals.css';
import { ReactNode } from 'react';
import { AuthProvider } from '../components/AuthProvider';
import { ThemeProvider } from '../components/theme-provider';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';
import { FetchPatch } from '../components/debug/FetchPatch';

export const metadata = {
  title: 'Over The Hill',
  description: 'Hill Chart Application',
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const isDebugIngestEnabled =
    process.env.NEXT_PUBLIC_DEBUG_INGEST === '1' || !!process.env.NEXT_PUBLIC_DEBUG_INGEST_URL;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {process.env.NODE_ENV === 'development' && isDebugIngestEnabled ? <FetchPatch /> : null}
          <ServiceWorkerRegister />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
