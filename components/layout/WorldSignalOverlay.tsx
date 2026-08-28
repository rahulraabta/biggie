'use client';

import React from 'react';
import { Compass, Globe, MapPin, ArrowRight, Layers } from 'lucide-react';
import { getCountryCoordinates } from '@/src/utils/geoUtils';

interface WorldSignalOverlayProps {
  selectedCountryCode: string | null;
  selectedRegionName: string | null;
  selectedMarketId: string | null;
  totalGlobalSignals?: number;
  onSwitchToGrid: () => void;
}

export const WorldSignalOverlay: React.FC<WorldSignalOverlayProps> = ({
  selectedCountryCode,
  selectedRegionName,
  selectedMarketId,
  totalGlobalSignals = 85,
  onSwitchToGrid,
}) => {
  const currentCode = selectedCountryCode || selectedMarketId || 'GLOBAL';
  const geo = getCountryCoordinates(currentCode);
  const formattedLat = geo.lat >= 0 ? `${geo.lat.toFixed(2)}° N` : `${Math.abs(geo.lat).toFixed(2)}° S`;
  const formattedLng = geo.lng >= 0 ? `${geo.lng.toFixed(2)}° E` : `${Math.abs(geo.lng).toFixed(2)}° W`;

  return (
    <div className="hidden xl:flex flex-col absolute top-4 left-4 z-20 max-w-sm pointer-events-auto panel-editorial p-5 shadow-2xl border-l-2 border-l-orange-600">
      {/* Eyebrow */}
      <div className="flex items-center space-x-2 text-[10px] font-mono-technical font-bold text-orange-500 uppercase tracking-widest mb-1.5">
        <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '12s' }} />
        <span>ORBITAL FIELD MANUAL · SIGNAL FIELD</span>
      </div>

      {/* Main Editorial Headline */}
      <h2 className="text-xl font-serif-display font-normal text-slate-100 leading-snug mb-2">
        Find the pressure points where news becomes possibility.
      </h2>

      {/* Explanatory Deck */}
      <p className="text-xs text-slate-300 leading-relaxed font-sans-technical mb-4">
        Opportunity Earth clusters global reporting into investable, buildable, and testable market signals.
      </p>

      {/* Dynamic Coordinate & Radar Readout */}
      <div className="p-2.5 bg-[#050811]/90 rounded-lg border border-slate-800/80 mb-4 space-y-1 font-mono-technical text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>Target Coordinates:</span>
          <span className="text-orange-400 font-bold">{formattedLat}, {formattedLng}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Active Context:</span>
          <span className="text-slate-100 font-bold flex items-center">
            <MapPin className="w-3 h-3 mr-1 text-sky-400" />
            {selectedRegionName ? `${currentCode} / ${selectedRegionName}` : geo.name}
          </span>
        </div>
      </div>

      {/* Action Cue & List View Switcher */}
      <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-800/80">
        <span className="text-slate-400 font-mono-technical">
          Drag globe · Select market
        </span>
        <button
          onClick={onSwitchToGrid}
          className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center group"
          aria-label="Switch to list view"
        >
          <span>List view</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
