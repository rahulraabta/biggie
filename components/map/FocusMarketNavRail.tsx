'use client';

import React from 'react';
import { Globe, MapPin, Layers, ChevronRight, RotateCcw } from 'lucide-react';
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
      {/* Desktop Vertical Floating Priority Market Rail (Left Side of Stage) */}
      <div className="hidden xl:flex flex-col absolute left-4 top-4 bottom-4 z-20 w-52 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 shadow-2xl overflow-y-auto pointer-events-auto">
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800 px-1">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center">
            <Globe className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            Priority Radar Views
          </span>
          {(selectedMarketId || selectedCountryCode) && (
            <button
              onClick={onResetView}
              className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
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
          className={`w-full p-2 rounded-xl text-xs font-semibold transition-all mb-1 flex items-center justify-between text-left group ${
            !selectedMarketId && !selectedCountryCode
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
          aria-label="Select World View"
        >
          <div className="flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>World Overview</span>
          </div>
          {!selectedMarketId && !selectedCountryCode && (
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>

        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider my-1 px-1">
          Focus Markets
        </div>

        {/* Priority Market Presets List */}
        <div className="space-y-1 flex-1 overflow-y-auto pr-0.5">
          {markets.map((market) => {
            const isSelected =
              selectedMarketId === market.id ||
              (selectedCountryCode === market.isoCode && market.kind === 'country');

            return (
              <button
                key={market.id}
                onClick={() => onSelectMarket(market.id)}
                className={`w-full p-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between text-left group ${
                  isSelected
                    ? 'bg-sky-600/90 text-white border border-sky-400/50 shadow-md shadow-sky-600/20'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/70 border border-transparent'
                }`}
                aria-label={`Select ${market.displayName} focus market`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  {market.kind === 'aggregation' ? (
                    <Layers className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-amber-400'}`} />
                  ) : (
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-sky-400'}`} />
                  )}
                  <span className="truncate">{market.displayName}</span>
                </div>
                {market.kind === 'aggregation' && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      isSelected ? 'bg-sky-700 text-white' : 'bg-slate-800 text-amber-400 border border-amber-900/60'
                    }`}
                  >
                    AGGR
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Horizontally Scrollable Priority Market Chips (Top of Stage) */}
      <div className="xl:hidden flex items-center space-x-2 overflow-x-auto px-4 py-2 bg-slate-900/95 border-b border-slate-800 no-scrollbar z-20 pointer-events-auto">
        <button
          onClick={() => onSelectMarket(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center space-x-1.5 ${
            !selectedMarketId && !selectedCountryCode
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
          aria-label="Select World View"
        >
          <Globe className="w-3.5 h-3.5" />
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
              aria-label={`Select ${market.displayName}`}
            >
              {market.kind === 'aggregation' ? (
                <Layers className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{market.displayName}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
