'use client';

import React from 'react';
import { Activity, Globe, Sparkles, ShieldCheck, AlertTriangle, ShieldAlert, Radio } from 'lucide-react';
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
      <div className="bg-[#040711] border-b border-slate-800/80 px-4 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs font-mono tracking-wider animate-pulse text-slate-500">
          <span className="flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            <span>SYNCHRONIZING ORBITAL FIELD TELEMETRY...</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#040711] border-b border-slate-800/80 px-4 lg:px-8 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs font-mono">
        {/* Signal Metric 1: Total Signals */}
        <div className="flex items-center space-x-2 bg-slate-900/60 border border-slate-800/90 rounded-md px-2.5 py-1">
          <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Signals:</span>
          <span className="font-bold text-slate-100 tabular-nums">{totalSignals}</span>
        </div>

        {/* Signal Metric 2: Active Markets */}
        <div className="flex items-center space-x-2 bg-slate-900/60 border border-slate-800/90 rounded-md px-2.5 py-1">
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Active Hubs:</span>
          <span className="font-bold text-slate-100 tabular-nums">{activeCountries}</span>
        </div>

        {/* Signal Metric 3: Total Opportunities */}
        <div className="flex items-center space-x-2 bg-slate-900/60 border border-slate-800/90 rounded-md px-2.5 py-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Opportunities:</span>
          <span className="font-bold text-amber-400 tabular-nums">{totalOpps}</span>
        </div>

        {/* Signal Metric 4: High Viability Band */}
        <div className="flex items-center space-x-2 bg-emerald-950/40 border border-emerald-800/60 rounded-md px-2.5 py-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300/80 uppercase tracking-wider text-[10px]">High (71-100%):</span>
          <span className="font-bold text-emerald-400 tabular-nums">{greenCount}</span>
        </div>

        {/* Signal Metric 5: Medium Viability Band */}
        <div className="flex items-center space-x-2 bg-amber-950/40 border border-amber-800/60 rounded-md px-2.5 py-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300/80 uppercase tracking-wider text-[10px]">Medium (41-70%):</span>
          <span className="font-bold text-amber-400 tabular-nums">{orangeCount}</span>
        </div>

        {/* Signal Metric 6: Low Viability Band */}
        <div className="flex items-center space-x-2 bg-rose-950/40 border border-rose-800/60 rounded-md px-2.5 py-1">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-rose-300/80 uppercase tracking-wider text-[10px]">Low (0-40%):</span>
          <span className="font-bold text-rose-400 tabular-nums">{redCount}</span>
        </div>
      </div>
    </div>
  );
};
