import type { Metadata } from 'next';
import { LandingPage } from '@/components/marketing/LandingPage';

const description = 'Multi-agent AI analyzes real-time GDELT news to uncover evidence-backed business, innovation, and investment opportunities around the world.';

export const metadata: Metadata = {
  title: 'Opportunity Earth — Discover Global Opportunities',
  description,
  openGraph: {
    title: 'Discover Global Opportunities Before They Happen',
    description,
    type: 'website',
  },
};

export default function Page() {
  return <LandingPage />;
}
