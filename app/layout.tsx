import './globals.css';
import { ReactNode } from 'react';
import { AuthProvider } from '../components/AuthProvider';
import { ThemeProvider } from '../components/theme-provider';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';

export const metadata = {
  title: 'Over The Hill',
  description: 'Hill Chart Application',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ServiceWorkerRegister />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
