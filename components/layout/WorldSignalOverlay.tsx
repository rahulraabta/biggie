'use client';

import React, { useState } from 'react';
import { Compass, Globe, MapPin, ArrowRight, Sparkles, Orbit, ChevronDown, ChevronUp } from 'lucide-react';
import { getCountryCoordinates } from '@/src/utils/geoUtils';
import { motion, AnimatePresence } from 'framer-motion';

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
  // Signal Field briefing — collapsed to a compact pill by default so the Earth stays unobstructed
  const [isExpanded, setIsExpanded] = useState(false);

  const currentCode = selectedCountryCode || selectedMarketId || 'GLOBAL';
  const geo = getCountryCoordinates(currentCode);
  const formattedLat = geo.lat >= 0 ? `${geo.lat.toFixed(2)}° N` : `${Math.abs(geo.lat).toFixed(2)}° S`;
  const formattedLng = geo.lng >= 0 ? `${geo.lng.toFixed(2)}° E` : `${Math.abs(geo.lng).toFixed(2)}° W`;

  return (
    <>
      {/* Collapsed Compact Signal Pill (top-right, below Radar Status) */}
      {!isExpanded && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsExpanded(true)}
          className="hidden xl:flex absolute top-40 right-4 z-20 items-center space-x-2 glass-panel rounded-2xl px-3.5 py-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] pointer-events-auto hover:bg-white/10 transition-all duration-300 font-mono"
          aria-expanded={false}
          aria-label="Expand world signal field briefing"
        >
          <Orbit className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '10s' }} />
          <span className="text-[10px] font-extrabold uppercase tracking-widest emerald-gradient-text">
            Signal Field
          </span>
          <span className="text-[10px] text-slate-400 tabular-nums font-semibold">
            {formattedLat}, {formattedLng}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </motion.button>
      )}

      {/* Expanded Signal Field Briefing Card */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.28 }}
            className="hidden xl:flex flex-col absolute top-40 right-4 z-20 max-w-sm pointer-events-auto glass-panel p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] rounded-2xl relative overflow-hidden"
            role="region"
            aria-label="World signal field briefing"
          >
            {/* Top Emerald Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

            {/* Eyebrow badge + collapse control */}
            <div className="flex items-center justify-between text-[10px] font-mono font-extrabold uppercase tracking-widest mb-2">
              <span className="flex items-center space-x-2">
                <Orbit className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '10s' }} />
                <span className="emerald-gradient-text">WORLD MAP SIGNAL FIELD</span>
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-100 hover:bg-white/10 transition-all"
                title="Collapse signal field briefing"
                aria-label="Collapse signal field briefing"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            {/* Main Headline */}
            <h2 className="text-base font-extrabold text-slate-100 leading-snug mb-2">
              Discover pressure points where global news turns into actionable venture opportunities.
            </h2>

            {/* Explanatory Deck */}
            <p className="text-xs text-slate-400 leading-relaxed mb-4 font-medium">
              Opportunity Earth clusters worldwide news signals across high-growth commercial, innovation, & investment sectors.
            </p>

            {/* Dynamic Coordinate & Radar Readout */}
            <div className="p-3 bg-black/40 rounded-xl ring-1 ring-white/10 backdrop-blur-md mb-4 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span>Target Coordinates:</span>
                <span className="text-emerald-300 font-bold tabular-nums flex items-center">
                  <Sparkles className="w-3 h-3 mr-1 text-amber-300" />
                  {formattedLat}, {formattedLng}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Active Context:</span>
                <span className="text-slate-100 font-bold flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
                  {selectedRegionName ? `${currentCode} / ${selectedRegionName}` : geo.name}
                </span>
              </div>
            </div>

            {/* Action Cue & List View Switcher */}
            <div className="flex items-center justify-between text-[11px] pt-3 border-t border-white/10">
              <span className="text-slate-400 font-mono flex items-center">
                <Globe className="w-3.5 h-3.5 mr-1 text-emerald-400 animate-spin" style={{ animationDuration: '24s' }} />
                Drag map · Select hub
              </span>
              <motion.button
                whileHover={{ scale: 1.04, x: 2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSwitchToGrid}
                className="text-xs font-black text-emerald-300 hover:text-emerald-200 transition-all duration-300 flex items-center group bg-emerald-500/10 px-3 py-1.5 rounded-xl ring-1 ring-emerald-500/40 hover:bg-emerald-500/20"
                aria-label="Switch to grid view"
              >
                <span>Grid view</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
