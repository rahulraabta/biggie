'use client';

import React from 'react';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { Activity, ShieldCheck, AlertTriangle, AlertCircle, BarChart } from 'lucide-react';

interface StatsBarProps {
  opportunities: OpportunityResponseItem[];
  totalCount: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({ opportunities, totalCount }) => {
  const greenCount = opportunities.filter((o) => o.band === 'green').length;
  const orangeCount = opportunities.filter((o) => o.band === 'orange').length;
  const redCount = opportunities.filter((o) => o.band === 'red').length;

  const avgProb = opportunities.length > 0
    ? (opportunities.reduce((acc, o) => acc + o.probability_score, 0) / opportunities.length).toFixed(1)
    : '0.0';

  return (
    <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Signal Metrics Pill Group */}
        <div className="flex items-center space-x-4 flex-wrap gap-y-1">
          <div className="flex items-center text-slate-300">
            <Activity className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            <span className="text-slate-400 mr-1">Total Active Signals:</span>
            <span className="font-bold text-slate-100">{totalCount}</span>
          </div>

          <div className="h-3 w-px bg-slate-800 hidden sm:block" />

          {/* Band Counters */}
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              <ShieldCheck className="w-3 h-3 mr-1" />
              {greenCount} High Viability (Green)
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {orangeCount} Medium (Orange)
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
              <AlertCircle className="w-3 h-3 mr-1" />
              {redCount} Low (Red)
            </span>
          </div>
        </div>

        {/* Right Stats */}
        <div className="flex items-center text-slate-400">
          <BarChart className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          <span>Average Probability Score: </span>
          <span className="font-bold text-slate-200 ml-1">{avgProb}%</span>
        </div>
      </div>
    </div>
  );
};
