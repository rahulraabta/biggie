'use client';

import React from 'react';
import { MapPin, Compass, Sparkles, Radio } from 'lucide-react';
import { GeographicGranularity } from '@/src/types/mapTypes';
import { motion } from 'framer-motion';

interface RadarActivityOverlayProps {
  timeWindow?: string;
  selectedMarketId?: string | null;
  selectedCountryCode?: string | null;
  selectedRegionName?: string | null;
  granularity?: GeographicGranularity;
  sourceMode?: 'database' | 'mock';
  lastUpdated?: string;
}

export const RadarActivityOverlay: React.FC<RadarActivityOverlayProps> = ({
  timeWindow = '7d',
  selectedMarketId,
  selectedCountryCode,
  selectedRegionName,
  granularity = 'country',
  sourceMode = 'mock',
  lastUpdated,
}) => {
  const displayLocation = selectedRegionName
    ? `${selectedCountryCode || ''} / ${selectedRegionName}`
    : selectedCountryCode || selectedMarketId || 'Global World Field';

  const granularityLabel = selectedRegionName
    ? granularity === 'region'
      ? 'Verified Region Signal'
      : 'Navigation Anchor'
    : selectedCountryCode || selectedMarketId
    ? 'Country Level'
    : 'Worldwide Overview';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 right-4 z-20 pointer-events-auto glass-panel rounded-2xl p-3.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] text-xs max-w-xs space-y-2.5 font-mono"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px] flex items-center">
          <Radio className="w-3.5 h-3.5 text-emerald-400 mr-1.5 animate-pulse" />
          Radar Status
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ring-1 ${
            sourceMode === 'database'
              ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/40'
              : 'bg-amber-500/10 text-amber-300 ring-amber-500/40'
          }`}
        >
          {sourceMode === 'database' ? 'Live DB' : 'Demo Mode'}
        </span>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>Focus Target:</span>
          <span className="font-bold text-emerald-300 truncate max-w-[130px] flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
            {displayLocation}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400">
          <span>Granularity:</span>
          <span className="font-semibold text-emerald-200 flex items-center">
            <Compass className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0 animate-spin" style={{ animationDuration: '16s' }} />
            {granularityLabel}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400">
          <span>Time Window:</span>
          <span className="font-bold text-amber-300 flex items-center">
            <Sparkles className="w-3 h-3 mr-1 text-amber-400 animate-pulse" />
            {timeWindow}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
