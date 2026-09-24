'use client';

import React from 'react';
import { Pause, Play, RotateCcw, Activity, Sparkles, Orbit, Compass } from 'lucide-react';
import { MapLegend } from '../map/MapLegend';
import { MotionMode, MOTION_MODE_LABELS } from './motionConfig';
import { motion } from 'framer-motion';

interface GlobeControlsProps {
  selectedCountryCode: string | null;
  selectedRegionName: string | null;
  selectedMarketId?: string | null;
  onResetView: () => void;
  isAutoRotate: boolean;
  onToggleAutoRotate: () => void;
  motionMode: MotionMode;
  onMotionModeChange: (mode: MotionMode) => void;
  activePointCount: number;
}

export const GlobeControls: React.FC<GlobeControlsProps> = ({
  selectedCountryCode,
  selectedRegionName,
  selectedMarketId,
  onResetView,
  isAutoRotate,
  onToggleAutoRotate,
  motionMode,
  onMotionModeChange,
  activePointCount,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-4 lg:p-6 flex flex-col justify-end z-10">
      {/* Top edge stays clear for the floating stage toggles (Dossiers + Field Atlas) — HUD lives along the bottom rail */}

      {/* Bottom Floating Rail: Legend | Breadcrumb | Reset & Motion Toggles */}
      <div className="flex flex-wrap items-end justify-between gap-4 pointer-events-auto">
        {/* Map Legend */}
        <MapLegend />

        {/* Active Breadcrumb Badge */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="flex items-center space-x-2.5 glass-panel rounded-2xl px-4 py-2 text-xs text-slate-200 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
        >
          <Orbit className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '12s' }} />
          <span className="font-bold text-slate-500">View Target:</span>
          {!selectedCountryCode && !selectedMarketId && (
            <span className="font-extrabold text-emerald-300 flex items-center">
              Global World Map <span className="ml-2 text-[10px] text-emerald-400 font-mono font-bold">({activePointCount} Hubs)</span>
            </span>
          )}
          {selectedMarketId && !selectedCountryCode && (
            <span className="font-extrabold text-amber-300 flex items-center">
              Market View: {selectedMarketId}
            </span>
          )}
          {selectedCountryCode && !selectedRegionName && (
            <span className="font-extrabold text-emerald-200 flex items-center">
              Country: {selectedCountryCode}
            </span>
          )}
          {selectedCountryCode && selectedRegionName && (
            <span className="font-extrabold text-emerald-200 flex items-center">
              {selectedCountryCode} / {selectedRegionName}
            </span>
          )}
        </motion.div>

        {/* Reset View + Control Toggles Group */}
        <div className="flex flex-wrap items-center space-x-2.5">
          {(selectedCountryCode || selectedMarketId) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onResetView}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs font-black shadow-[0_0_20px_-4px_rgba(16,185,129,0.5)] transition-all flex items-center space-x-2"
              aria-label="Reset world view"
            >
              <RotateCcw className="w-4 h-4 text-slate-950" />
              <span>Reset World View</span>
            </motion.button>
          )}

        {/* Control Toggles: Auto-rotate & Motion Selector */}
        <div className="flex items-center space-x-2.5 glass-panel rounded-2xl p-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
          {/* Auto rotate toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleAutoRotate}
            disabled={motionMode === 'static'}
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              isAutoRotate && motionMode === 'full'
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
            } ${motionMode === 'static' ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={
              motionMode === 'static'
                ? 'Auto-rotation disabled in Static mode'
                : 'Toggle Earth Auto-Rotation'
            }
            aria-label="Toggle Earth Auto-Rotation"
          >
            {isAutoRotate && motionMode === 'full' ? (
              <Pause className="w-4 h-4 text-emerald-300" />
            ) : (
              <Play className="w-4 h-4 text-emerald-300" />
            )}
            <span className="hidden sm:inline">Rotate</span>
          </motion.button>

          <span className="text-white/20">|</span>

          {/* 3-State Motion Mode Picker */}
          <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl ring-1 ring-white/10">
            {(['full', 'reduced', 'static'] as MotionMode[]).map((mode) => {
              const active = motionMode === mode;
              const meta = MOTION_MODE_LABELS[mode];

              return (
                <button
                  key={mode}
                  onClick={() => onMotionModeChange(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-300 capitalize ${
                    active
                      ? mode === 'full'
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : mode === 'reduced'
                        ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                  }`}
                  title={`${meta.title}: ${meta.description}`}
                  aria-label={`Switch motion mode to ${meta.title}`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
