'use client';

import React from 'react';
import { Radio, Clock, ShieldCheck, AlertCircle, Info, Sparkles } from 'lucide-react';

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
    <div className="bg-[#080d1a] border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Product Headline & Subtitle */}
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-sky-950/60 border border-sky-800/80 rounded-xl text-sky-400 shrink-0 mt-0.5">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-100 flex items-center">
                Global Opportunity Radar
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-950/80 text-sky-300 border border-sky-800/80">
                Window: {timeWindow}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Clustering worldwide GDELT news into business, innovation, & investment prospects with automated viability scoring.
            </p>
          </div>
        </div>

        {/* Right: Live Metadata Pills & AI Disclaimer Notice */}
        <div className="flex items-center space-x-3 shrink-0 self-end md:self-auto text-[11px]">
          <div className="flex items-center space-x-1.5 text-slate-400 bg-[#0e1726] px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Updated: <strong className="text-slate-200">{formattedTime}</strong></span>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-400 bg-[#0e1726] px-3 py-1.5 rounded-xl border border-slate-800">
            {sourceMode === 'database' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Live Database</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-semibold">Demo Mode</span>
              </>
            )}
          </div>

          <div className="hidden xl:flex items-center space-x-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" title="Model-generated analysis from public news streams. Not financial or investment advice.">
            <Info className="w-3.5 h-3.5" />
            <span className="text-[10px] italic">AI Disclaimer</span>
          </div>
        </div>
      </div>
    </div>
  );
};
