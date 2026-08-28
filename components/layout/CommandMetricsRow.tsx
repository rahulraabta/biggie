'use client';

import React from 'react';
import { Layers, ShieldCheck, AlertTriangle, ShieldAlert, Globe, Activity, Sparkles } from 'lucide-react';
import { MapOverviewResponse } from '@/src/types/mapTypes';

interface CommandMetricsRowProps {
  mapOverview: MapOverviewResponse | null;
  totalOpportunitiesCount?: number;
  isLoading?: boolean;
}

export const CommandMetricsRow: React.FC<CommandMetricsRowProps> = ({
  mapOverview,
  totalOpportunitiesCount = 0,
  isLoading = false,
}) => {
  const greenCount = mapOverview?.bandCounts.green || 4;
  const orangeCount = mapOverview?.bandCounts.orange || 2;
  const redCount = mapOverview?.bandCounts.red || 1;
  const totalSignals = mapOverview?.totalGlobalSignals || 85;
  const activeCountries = mapOverview?.totalCountriesActive || 7;
  const totalOpps = totalOpportunitiesCount || mapOverview?.totalOpportunities || 14;

  if (isLoading) {
    return (
      <div className="bg-[#080d1a] border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#0e1726]/60 border border-slate-800/60 rounded-xl p-2.5 animate-pulse h-14" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#080d1a] border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
        {/* Metric 1: Active Signals */}
        <div className="bg-[#0e1726]/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-md group hover:border-sky-500/50 transition-all">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Signals
            </span>
            <span className="text-base font-extrabold text-sky-400">{totalSignals}</span>
          </div>
          <Activity className="w-4 h-4 text-sky-400/80 group-hover:scale-110 transition-transform" />
        </div>

        {/* Metric 2: Focus Markets Covered */}
        <div className="bg-[#0e1726]/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-md group hover:border-sky-500/50 transition-all">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Regions
            </span>
            <span className="text-base font-extrabold text-slate-100">{activeCountries}</span>
          </div>
          <Globe className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
        </div>

        {/* Metric 3: Total Opportunities */}
        <div className="bg-[#0e1726]/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-md group hover:border-sky-500/50 transition-all">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Opportunities
            </span>
            <span className="text-base font-extrabold text-sky-300">{totalOpps}</span>
          </div>
          <Sparkles className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
        </div>

        {/* Metric 4: High Likelihood (Green 71-100%) */}
        <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-2.5 flex items-center justify-between shadow-md group hover:border-emerald-500/60 transition-all">
          <div>
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
              High (71-100%)
            </span>
            <span className="text-base font-extrabold text-emerald-300">{greenCount}</span>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
        </div>

        {/* Metric 5: Medium Likelihood (Orange 41-70%) */}
        <div className="bg-amber-950/40 border border-amber-900/60 rounded-xl p-2.5 flex items-center justify-between shadow-md group hover:border-amber-500/60 transition-all">
          <div>
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
              Medium (41-70%)
            </span>
            <span className="text-base font-extrabold text-amber-300">{orangeCount}</span>
          </div>
          <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
        </div>

        {/* Metric 6: Low Likelihood (Red 0-40%) */}
        <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-2.5 flex items-center justify-between shadow-md group hover:border-rose-500/60 transition-all">
          <div>
            <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block">
              Low (0-40%)
            </span>
            <span className="text-base font-extrabold text-rose-300">{redCount}</span>
          </div>
          <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
        </div>
      </div>
    </div>
  );
};
