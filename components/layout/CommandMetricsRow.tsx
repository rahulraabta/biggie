'use client';

import React from 'react';
import { Activity, Globe, Sparkles, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
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
      <div className="bg-[#050811] border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs font-mono-technical animate-pulse text-slate-500">
          <span>Loading Orbital Field Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050811] border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs font-mono-technical">
        {/* Signal Metric 1 */}
        <div className="flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Global Signals:</span>
          <span className="font-extrabold text-slate-100">{totalSignals}</span>
        </div>

        <span className="text-slate-800 hidden sm:inline">|</span>

        {/* Signal Metric 2 */}
        <div className="flex items-center space-x-2">
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Active Markets:</span>
          <span className="font-extrabold text-slate-100">{activeCountries}</span>
        </div>

        <span className="text-slate-800 hidden sm:inline">|</span>

        {/* Signal Metric 3 */}
        <div className="flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Opportunities:</span>
          <span className="font-extrabold text-slate-100">{totalOpps}</span>
        </div>

        <span className="text-slate-800 hidden md:inline">|</span>

        {/* Signal Metric 4: High */}
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">High (71-100%):</span>
          <span className="font-extrabold text-emerald-400">{greenCount}</span>
        </div>

        <span className="text-slate-800 hidden md:inline">|</span>

        {/* Signal Metric 5: Medium */}
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Medium (41-70%):</span>
          <span className="font-extrabold text-amber-400">{orangeCount}</span>
        </div>

        <span className="text-slate-800 hidden lg:inline">|</span>

        {/* Signal Metric 6: Low */}
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Low (0-40%):</span>
          <span className="font-extrabold text-rose-400">{redCount}</span>
        </div>
      </div>
    </div>
  );
};
