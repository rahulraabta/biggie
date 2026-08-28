'use client';

import React from 'react';
import { Globe, MapPin, Layers, RotateCcw, Compass } from 'lucide-react';
import { FOCUS_MARKETS, FocusMarketId, getAllFocusMarkets } from '@/src/config/focusMarkets';

interface FocusMarketNavRailProps {
  selectedMarketId: string | null;
  selectedCountryCode: string | null;
  onSelectMarket: (marketId: string | null) => void;
  onResetView: () => void;
}

export const FocusMarketNavRail: React.FC<FocusMarketNavRailProps> = ({
  selectedMarketId,
  selectedCountryCode,
  onSelectMarket,
  onResetView,
}) => {
  const markets = getAllFocusMarkets();

  return (
    <>
      {/* Desktop Vertical Field Atlas Rail (Left Stage Overlay) */}
      <div className="hidden xl:flex flex-col absolute left-4 top-4 bottom-4 z-20 w-56 panel-editorial p-3 shadow-2xl overflow-y-auto pointer-events-auto border-l-2 border-l-orange-600">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 px-1 text-[10px] font-mono-technical">
          <span className="font-bold text-orange-500 uppercase tracking-widest flex items-center">
            <Compass className="w-3.5 h-3.5 mr-1.5" />
            FIELD ATLAS (10)
          </span>
          {(selectedMarketId || selectedCountryCode) && (
            <button
              onClick={onResetView}
              className="p-1 text-slate-400 hover:text-orange-400 transition-colors"
              title="Reset to World View"
              aria-label="Reset to World View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global World Preset */}
        <button
          onClick={() => onSelectMarket(null)}
          className={`w-full p-2.5 rounded-lg text-xs font-mono-technical transition-all mb-1 flex items-center justify-between text-left group border ${
            !selectedMarketId && !selectedCountryCode
              ? 'bg-orange-600 text-white border-orange-500 shadow-md'
              : 'bg-[#050811]/80 text-slate-300 hover:text-slate-100 hover:bg-slate-900 border-slate-800/80'
          }`}
          aria-label="Select World Overview"
        >
          <div className="flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5 shrink-0 text-orange-400" />
            <span className="font-bold">World Overview</span>
          </div>
          <span className="text-[9px] font-mono-technical opacity-80">0.0° N, 0.0° E</span>
        </button>

        <div className="text-[9px] font-mono-technical font-semibold text-slate-500 uppercase tracking-widest my-1.5 px-1">
          Priority Presets
        </div>

        {/* Field Atlas Items List */}
        <div className="space-y-1 flex-1 overflow-y-auto pr-0.5">
          {markets.map((market) => {
            const isSelected =
              selectedMarketId === market.id ||
              (selectedCountryCode === market.isoCode && market.kind === 'country');

            const formattedCoords = `${market.camera.lat.toFixed(1)}°, ${market.camera.lng.toFixed(1)}°`;

            return (
              <button
                key={market.id}
                onClick={() => onSelectMarket(market.id)}
                className={`w-full p-2 rounded-lg text-xs font-sans-technical transition-all flex items-center justify-between text-left group border ${
                  isSelected
                    ? 'bg-orange-950/80 text-white border-orange-500 shadow-md shadow-orange-950/50'
                    : 'bg-[#050811]/60 hover:bg-[#0e162b] text-slate-300 border-slate-800/60'
                }`}
                aria-label={`Select ${market.displayName} field market`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  {market.kind === 'aggregation' ? (
                    <Layers className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-amber-400'}`} />
                  ) : (
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-orange-500'}`} />
                  )}
                  <span className="font-bold truncate text-[11px]">{market.displayName}</span>
                </div>
                <span className="text-[9px] font-mono-technical text-slate-400 shrink-0 ml-1">
                  {formattedCoords}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Horizontally Scrollable Field Atlas Chips (Top Overlay) */}
      <div className="xl:hidden flex items-center space-x-2 overflow-x-auto px-4 py-2 bg-[#050811]/95 border-b border-slate-800 no-scrollbar z-20 pointer-events-auto">
        <button
          onClick={() => onSelectMarket(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono-technical font-bold whitespace-nowrap shrink-0 transition-all flex items-center space-x-1.5 border ${
            !selectedMarketId && !selectedCountryCode
              ? 'bg-orange-600 text-white border-orange-500 shadow-md'
              : 'bg-[#090e1c] text-slate-300 border-slate-800'
          }`}
          aria-label="Select World View"
        >
          <Globe className="w-3.5 h-3.5 text-orange-400" />
          <span>World</span>
        </button>

        {markets.map((market) => {
          const isSelected =
            selectedMarketId === market.id ||
            (selectedCountryCode === market.isoCode && market.kind === 'country');

          return (
            <button
              key={market.id}
              onClick={() => onSelectMarket(market.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono-technical font-bold whitespace-nowrap shrink-0 transition-all flex items-center space-x-1.5 border ${
                isSelected
                  ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                  : 'bg-[#090e1c] text-slate-300 border-slate-800'
              }`}
              aria-label={`Select ${market.displayName}`}
            >
              {market.kind === 'aggregation' ? (
                <Layers className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
              )}
              <span>{market.displayName}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
