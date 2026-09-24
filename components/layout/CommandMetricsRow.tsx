'use client';

import React from 'react';
import { Activity, Globe, Sparkles, ShieldCheck, AlertTriangle, ShieldAlert, Radio } from 'lucide-react';
import { MapOverviewResponse } from '@/src/types/mapTypes';
import { motion } from 'framer-motion';

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
      <div className="glass-chrome border-b border-white/10 px-4 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs font-mono tracking-wider animate-pulse text-emerald-300">
          <span className="flex items-center space-x-2 font-bold">
            <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>SYNCHRONIZING GLOBAL SIGNAL TELEMETRY...</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-chrome border-b border-white/10 px-4 lg:px-8 py-2 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs font-mono">
        {/* Signal Metric 1: Total Signals */}
        <motion.div
          whileHover={{ scale: 1.04, y: -1 }}
          className="flex items-center space-x-2 bg-white/5 ring-1 ring-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md cursor-pointer transition-colors duration-300 hover:bg-white/10"
        >
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Signals:</span>
          <span className="font-extrabold text-emerald-300 tabular-nums text-sm">{totalSignals}</span>
        </motion.div>

        {/* Signal Metric 2: Active Markets */}
        <motion.div
          whileHover={{ scale: 1.04, y: -1 }}
          className="flex items-center space-x-2 bg-white/5 ring-1 ring-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md cursor-pointer transition-colors duration-300 hover:bg-white/10"
        >
          <Globe className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '20s' }} />
          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Active Hubs:</span>
          <span className="font-extrabold text-white tabular-nums text-sm">{activeCountries}</span>
        </motion.div>

        {/* Signal Metric 3: Total Opportunities */}
        <motion.div
          whileHover={{ scale: 1.04, y: -1 }}
          className="flex items-center space-x-2 bg-amber-500/10 ring-1 ring-amber-500/30 rounded-xl px-3 py-1.5 backdrop-blur-md cursor-pointer transition-colors duration-300 hover:bg-amber-500/15"
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-amber-300/80 uppercase tracking-wider text-[10px] font-bold">Opportunities:</span>
          <span className="font-extrabold text-amber-300 tabular-nums text-sm">{totalOpps}</span>
        </motion.div>

        {/* Signal Metric 4: High Viability Band */}
        <motion.div
          whileHover={{ scale: 1.04, y: -1 }}
          className="flex items-center space-x-2 bg-emerald-500/10 ring-1 ring-emerald-500/30 rounded-xl px-3 py-1.5 backdrop-blur-md cursor-pointer transition-colors duration-300 hover:bg-emerald-500/15"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-300/80 uppercase tracking-wider text-[10px] font-bold">High (71-100%):</span>
          <span className="font-extrabold text-emerald-300 tabular-nums text-sm">{greenCount}</span>
        </motion.div>

        {/* Signal Metric 5: Medium Viability Band */}
        <motion.div
          whileHover={{ scale: 1.04, y: -1 }}
          className="flex items-center space-x-2 bg-amber-500/10 ring-1 ring-amber-500/30 rounded-xl px-3 py-1.5 backdrop-blur-md cursor-pointer transition-colors duration-300 hover:bg-amber-500/15"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300/80 uppercase tracking-wider text-[10px] font-bold">Medium (41-70%):</span>
          <span className="font-extrabold text-amber-300 tabular-nums text-sm">{orangeCount}</span>
        </motion.div>

        {/* Signal Metric 6: Low Viability Band */}
        <motion.div
          whileHover={{ scale: 1.04, y: -1 }}
          className="flex items-center space-x-2 bg-rose-500/10 ring-1 ring-rose-500/30 rounded-xl px-3 py-1.5 backdrop-blur-md cursor-pointer transition-colors duration-300 hover:bg-rose-500/15"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="text-rose-300/80 uppercase tracking-wider text-[10px] font-bold">Low (0-40%):</span>
          <span className="font-extrabold text-rose-300 tabular-nums text-sm">{redCount}</span>
        </motion.div>
      </div>
    </div>
  );
};
