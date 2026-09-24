'use client';

import React, { useState } from 'react';
import { Globe, MapPin, Layers, RotateCcw, Compass, Sparkles, Orbit, ChevronLeft, ChevronRight } from 'lucide-react';
import { FOCUS_MARKETS, FocusMarketId, getAllFocusMarkets } from '@/src/config/focusMarkets';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Field Atlas HUD — collapsed to a compact badge by default so the Earth stays unobstructed
  const [isAtlasExpanded, setIsAtlasExpanded] = useState(false);

  return (
    <>
      {/* Desktop Collapsed Atlas Badge (compact pill below the dossiers toggle) */}
      {!isAtlasExpanded && (
        <motion.button
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsAtlasExpanded(true)}
          className="hidden xl:flex absolute left-4 top-20 z-20 items-center space-x-2 glass-panel rounded-2xl px-3.5 py-2 text-xs shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] pointer-events-auto hover:bg-white/10 transition-all duration-300"
          aria-expanded={false}
          aria-label="Expand Field Atlas market rail"
        >
          <Orbit className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '12s' }} />
          <span className="font-mono font-extrabold text-emerald-300 uppercase tracking-widest text-[10px]">
            Field Atlas ({markets.length})
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </motion.button>
      )}

      {/* Desktop Vertical Field Atlas Rail (expands over the stage on demand) */}
      <AnimatePresence>
        {isAtlasExpanded && (
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="hidden xl:flex flex-col absolute left-4 top-20 bottom-44 z-20 w-60 glass-panel p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] overflow-y-auto pointer-events-auto rounded-2xl"
          >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 px-1 text-xs font-mono">
          <span className="font-extrabold text-emerald-300 uppercase tracking-widest flex items-center">
            <Orbit className="w-4 h-4 mr-1.5 text-emerald-400 animate-spin" style={{ animationDuration: '12s' }} />
            FIELD ATLAS ({markets.length})
          </span>
          <div className="flex items-center space-x-1">
            {(selectedMarketId || selectedCountryCode) && (
              <button
                onClick={onResetView}
                className="p-1 text-slate-500 hover:text-emerald-300 transition-colors"
                title="Reset to World View"
                aria-label="Reset to World View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsAtlasExpanded(false)}
              className="p-1 text-slate-500 hover:text-slate-100 transition-colors"
              title="Collapse Field Atlas"
              aria-label="Collapse Field Atlas"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global World Preset */}
        <motion.button
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onSelectMarket(null)}
          className={`w-full p-3 rounded-xl text-xs font-mono transition-all duration-300 mb-2 flex items-center justify-between text-left group ring-1 ${
            !selectedMarketId && !selectedCountryCode
              ? 'bg-emerald-500 text-slate-950 ring-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'bg-white/5 text-slate-300 hover:text-slate-100 hover:bg-white/10 ring-white/10'
          }`}
          aria-label="Select World Overview"
        >
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 shrink-0 text-emerald-400 animate-spin" style={{ animationDuration: '20s' }} />
            <span className="font-extrabold">World Overview</span>
          </div>
          <span className="text-[10px] font-mono opacity-80 font-bold">0.0° N, 0.0° E</span>
        </motion.button>

        <div className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest my-2 px-1 flex items-center">
          <Sparkles className="w-3 h-3 mr-1 text-amber-400" />
          Priority Market Hubs
        </div>

        {/* Field Atlas Items List */}
        <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5">
          {markets.map((market) => {
            const isSelected =
              selectedMarketId === market.id ||
              (selectedCountryCode === market.isoCode && market.kind === 'country');

            const formattedCoords = `${market.camera.lat.toFixed(1)}°, ${market.camera.lng.toFixed(1)}°`;

            return (
              <motion.button
                key={market.id}
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectMarket(market.id)}
                className={`w-full p-2.5 rounded-xl text-xs transition-all duration-300 flex items-center justify-between text-left group ring-1 ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/60 shadow-[0_0_14px_-4px_rgba(16,185,129,0.5)] font-black'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-slate-100 ring-white/10'
                }`}
                aria-label={`Select ${market.displayName} field market`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  {market.kind === 'aggregation' ? (
                    <Layers className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-300' : 'text-amber-400'}`} />
                  ) : (
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-300' : 'text-emerald-400'}`} />
                  )}
                  <span className="font-extrabold truncate text-[11px]">{market.displayName}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500 shrink-0 ml-1 font-semibold">
                  {formattedCoords}
                </span>
              </motion.button>
            );
          })}
        </div>
          </motion.div>
          )}
        </AnimatePresence>

      {/* Mobile Horizontally Scrollable Field Atlas Chips (Top Overlay) */}
      <div className="xl:hidden flex items-center space-x-2 overflow-x-auto px-4 py-2.5 glass-chrome border-b border-white/10 no-scrollbar z-20 pointer-events-auto">
        <button
          onClick={() => onSelectMarket(null)}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap shrink-0 transition-all duration-300 flex items-center space-x-1.5 ring-1 ${
            !selectedMarketId && !selectedCountryCode
              ? 'bg-emerald-500 text-slate-950 ring-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10'
          }`}
          aria-label="Select World View"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
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
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap shrink-0 transition-all duration-300 flex items-center space-x-1.5 ring-1 ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 ring-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10'
              }`}
              aria-label={`Select ${market.displayName}`}
            >
              {market.kind === 'aggregation' ? (
                <Layers className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{market.displayName}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
