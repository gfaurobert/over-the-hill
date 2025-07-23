import { StagewiseToolbar } from '@stagewise/toolbar-next';
import ReactPlugin from '@stagewise-plugins/react';
import './globals.css';
import { ReactNode } from 'react';
import { AuthProvider } from '../components/AuthProvider';
import { ThemeProvider } from '../components/theme-provider';

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
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
      <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
    </html>
  );
}
