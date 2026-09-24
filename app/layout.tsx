import type { Metadata } from 'next';
import { DM_Serif_Display, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const serifDisplay = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-serif-display',
});

const sansTechnical = Inter({
  subsets: ['latin'],
  variable: '--font-sans-technical',
});

const monoTechnical = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-technical',
});

export const metadata: Metadata = {
  title: 'Opportunity Earth — Cinematic Venture Radar',
  description: 'Global news event ingestion, story clustering, and AI-driven business, innovation, & investment opportunity intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${serifDisplay.variable} ${sansTechnical.variable} ${monoTechnical.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950 font-sans"
      >
        {children}
      </body>
    </html>
  );
}
