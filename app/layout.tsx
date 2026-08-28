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
  title: 'Opportunity Earth — Orbital Field Manual | Global Intelligence Radar',
  description: 'Global news event ingestion, story clustering, and AI-driven business, innovation, & investment opportunity intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${serifDisplay.variable} ${sansTechnical.variable} ${monoTechnical.variable}`}>
      <body className="bg-[#050811] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-orange-600 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
