import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Antigravity Opportunity Radar | News-to-Opportunities Dashboard',
  description: 'Global news event ingestion, story clustering, and AI-driven business, innovation, & investment opportunity intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
