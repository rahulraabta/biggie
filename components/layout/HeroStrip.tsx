'use client';

import React from 'react';
import { Radio, Clock, ShieldCheck, AlertCircle, Info, Sparkles, Orbit } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeroStripProps {
  sourceMode?: 'database' | 'mock';
  totalGlobalSignals?: number;
  totalOpportunities?: number;
  lastUpdated?: string;
  timeWindow?: string;
}

export const HeroStrip: React.FC<HeroStripProps> = ({
  sourceMode = 'mock',
  totalGlobalSignals = 85,
  totalOpportunities = 14,
  lastUpdated,
  timeWindow = '7d',
}) => {
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <div className="glass-chrome border-b border-white/10 px-4 lg:px-8 py-2.5 relative overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs relative z-10">
        {/* Left: Product Headline */}
        <div className="flex items-start space-x-3.5">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="p-2 bg-emerald-500/10 ring-1 ring-emerald-500/40 rounded-xl text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.25)] shrink-0 mt-0.5"
          >
            <Orbit className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '14s' }} />
          </motion.div>

          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xs font-black text-white tracking-wide flex items-center">
                Global Opportunity Radar Signals
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40">
                Window: {timeWindow}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug font-medium">
              Clustering worldwide GDELT news into business, innovation, & investment prospects with automated viability scoring.
            </p>
          </div>
        </div>

        {/* Right: Live Metadata Pills */}
        <div className="flex items-center space-x-3 shrink-0 self-end md:self-auto text-[11px]">
          <div className="flex items-center space-x-2 text-slate-300 bg-white/5 px-3 py-1 rounded-xl ring-1 ring-white/10 backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Updated: <strong className="text-white font-mono" suppressHydrationWarning>{formattedTime}</strong></span>
          </div>

          <div className="flex items-center space-x-2 text-slate-300 bg-white/5 px-3 py-1 rounded-xl ring-1 ring-white/10 backdrop-blur-md">
            {sourceMode === 'database' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Live Engine</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-bold">Demo Mode</span>
              </>
            )}
          </div>

          <div
            className="hidden xl:flex items-center space-x-1.5 text-slate-500 hover:text-emerald-300 transition-colors cursor-pointer"
            title="Model-generated analysis from public news streams. Not financial or investment advice."
          >
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] italic font-medium">AI Disclaimer</span>
          </div>
        </div>
      </div>
    </div>
  );
};
