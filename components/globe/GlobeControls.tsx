import React from 'react';
import { Pause, Play, Eye, RotateCcw, Activity, Shield, Zap, Sparkles } from 'lucide-react';
import { MapLegend } from '../map/MapLegend';
import { MotionMode, MOTION_MODE_LABELS } from './motionConfig';

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
    <div className="absolute inset-0 pointer-events-none p-4 lg:p-6 flex flex-col justify-between z-10">
      {/* Top Bar Controls & Breadcrumb */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        {/* Active Breadcrumb */}
        <div className="flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 shadow-lg">
          <Activity className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="font-medium text-slate-400">View:</span>
          {!selectedCountryCode && !selectedMarketId && (
            <span className="font-bold text-slate-100 flex items-center">
              Global Overview <span className="ml-2 text-[10px] text-sky-400 font-semibold">({activePointCount} Regions)</span>
            </span>
          )}
          {selectedMarketId && !selectedCountryCode && (
            <span className="font-bold text-amber-400 flex items-center">
              Market View: {selectedMarketId}
            </span>
          )}
          {selectedCountryCode && !selectedRegionName && (
            <span className="font-bold text-sky-400 flex items-center">
              Country: {selectedCountryCode}
            </span>
          )}
          {selectedCountryCode && selectedRegionName && (
            <span className="font-bold text-sky-400 flex items-center">
              {selectedCountryCode} / {selectedRegionName}
            </span>
          )}
        </div>

        {/* Reset View Button */}
        {(selectedCountryCode || selectedMarketId) && (
          <button
            onClick={onResetView}
            className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center space-x-1.5 ring-2 ring-sky-500/50"
            aria-label="Reset world view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset World View</span>
          </button>
        )}
      </div>

      {/* Bottom Floating Rail */}
      <div className="flex items-end justify-between gap-4 pointer-events-auto">
        {/* Map Legend */}
        <MapLegend />

        {/* Control Toggles: Auto-rotate & 3-State Motion Selector */}
        <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-lg">
          {/* Auto rotate toggle */}
          <button
            onClick={onToggleAutoRotate}
            disabled={motionMode === 'static'}
            className={`p-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              isAutoRotate && motionMode === 'full'
                ? 'bg-sky-950/80 text-sky-400 border border-sky-800/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            } ${motionMode === 'static' ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={
              motionMode === 'static'
                ? 'Auto-rotation disabled in Static mode'
                : 'Toggle Earth Auto-Rotation'
            }
            aria-label="Toggle Earth Auto-Rotation"
          >
            {isAutoRotate && motionMode === 'full' ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Rotate</span>
          </button>

          <span className="text-slate-700">|</span>

          {/* 3-State Motion Mode Picker */}
          <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            {(['full', 'reduced', 'static'] as MotionMode[]).map((mode) => {
              const active = motionMode === mode;
              const meta = MOTION_MODE_LABELS[mode];

              return (
                <button
                  key={mode}
                  onClick={() => onMotionModeChange(mode)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all capitalize ${
                    active
                      ? mode === 'full'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : mode === 'reduced'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-700 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
  );
};
