'use client';

import React from 'react';
import { Activity, ShieldCheck, AlertCircle, Clock, MapPin, Compass } from 'lucide-react';
import { GeographicGranularity } from '@/src/types/mapTypes';

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
    : selectedCountryCode || selectedMarketId || 'Global Radar Field';

  const granularityLabel = selectedRegionName
    ? granularity === 'region'
      ? 'Verified Region Signal'
      : 'Navigation Anchor'
    : selectedCountryCode || selectedMarketId
    ? 'Country Level'
    : 'Worldwide Overview';

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-auto bg-[#080d1a]/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl text-xs max-w-xs space-y-2">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center">
          <Activity className="w-3.5 h-3.5 text-sky-400 mr-1.5 animate-pulse" />
          Radar Status
        </span>
        <span
          className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${
            sourceMode === 'database'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
              : 'bg-amber-950/80 text-amber-300 border-amber-700/80'
          }`}
        >
          {sourceMode === 'database' ? 'Live DB' : 'Demo Data'}
        </span>
      </div>

      <div className="space-y-1 text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>Focus Location:</span>
          <span className="font-bold text-slate-200 truncate max-w-[130px] flex items-center">
            <MapPin className="w-3 h-3 mr-1 text-sky-400 shrink-0" />
            {displayLocation}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400">
          <span>Granularity:</span>
          <span className="font-semibold text-sky-400 flex items-center">
            <Compass className="w-3 h-3 mr-1 shrink-0" />
            {granularityLabel}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400">
          <span>Time Window:</span>
          <span className="font-bold text-slate-200">{timeWindow}</span>
        </div>
      </div>
    </div>
  );
};
