'use client';

import React from 'react';
import { Search, RefreshCw, Globe, Radio, Filter, Bot, Clock } from 'lucide-react';
import { MotionMode, MOTION_MODE_LABELS } from '@/components/globe/motionConfig';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  sourceMode?: 'database' | 'mock';
  timeWindow?: string;
  onTimeWindowChange?: (tw: string) => void;
  motionMode?: MotionMode;
  onMotionModeChange?: (m: MotionMode) => void;
  toggleSidebar?: () => void;
  toggleQA?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isLoading = false,
  sourceMode = 'mock',
  timeWindow = '7d',
  onTimeWindowChange,
  motionMode = 'full',
  onMotionModeChange,
  toggleSidebar,
  toggleQA,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#080d1a]/95 border-b border-slate-800/80 backdrop-blur-xl px-4 lg:px-8 py-3 flex items-center justify-between shadow-2xl">
      {/* Left: Branding & Radar Mode Status Badge */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 via-sky-400 to-emerald-400 p-0.5 shadow-lg shadow-sky-500/20">
          <div className="w-full h-full bg-[#060a12] rounded-[10px] flex items-center justify-center">
            <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-extrabold text-slate-100 tracking-tight flex items-center">
              Opportunity <span className="text-sky-400 ml-1 font-extrabold">Earth</span>
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                sourceMode === 'database'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700/80'
              }`}
            >
              {sourceMode === 'database' ? 'LIVE RADAR' : 'DEMO PREVIEW'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Global News-to-Opportunities Strategic Intelligence Radar
          </p>
        </div>
      </div>

      {/* Center: Live Search Input */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search markets, sectors, headlines, or opportunities..."
            className="w-full pl-10 pr-4 py-2 bg-[#060a12]/90 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/80 transition-all focus-ring-custom"
            aria-label="Search markets, sectors, headlines, or opportunities"
          />
        </div>
      </div>

      {/* Right Controls: Time Window, Motion Mode, Refresh, Mobile Toggles */}
      <div className="flex items-center space-x-2.5">
        {/* Time Window Selector (Desktop) */}
        {onTimeWindowChange && (
          <div className="hidden xl:flex items-center space-x-1 bg-[#060a12] p-1 rounded-xl border border-slate-800 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            {(['24h', '7d', '30d'] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => onTimeWindowChange(tw)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  timeWindow === tw
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                aria-label={`Set time window to ${tw}`}
              >
                {tw}
              </button>
            ))}
          </div>
        )}

        {/* Motion Mode Selector (Desktop) */}
        {onMotionModeChange && (
          <div className="hidden md:flex items-center space-x-1 bg-[#060a12] p-1 rounded-xl border border-slate-800 text-[11px]">
            {(['full', 'reduced', 'static'] as MotionMode[]).map((mode) => {
              const active = motionMode === mode;
              const meta = MOTION_MODE_LABELS[mode];
              return (
                <button
                  key={mode}
                  onClick={() => onMotionModeChange(mode)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all ${
                    active
                      ? mode === 'full'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : mode === 'reduced'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-700 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                  title={`${meta.title}: ${meta.description}`}
                  aria-label={`Set motion mode to ${meta.title}`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile Filter Toggle */}
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-slate-100 border border-slate-800 transition-colors"
            title="Toggle Filter Sidebar"
            aria-label="Toggle Filter Sidebar"
          >
            <Filter className="w-4 h-4" />
          </button>
        )}

        {/* Refresh Radar Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 shadow-sm transition-all disabled:opacity-50"
          aria-label="Refresh Radar Signals"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isLoading ? 'Updating...' : 'Refresh Radar'}</span>
        </button>

        {/* Mobile AI Panel Toggle */}
        {toggleQA && (
          <button
            onClick={toggleQA}
            className="lg:hidden p-2 rounded-xl bg-sky-600 text-white hover:bg-sky-500 transition-colors"
            title="Toggle AI Co-Pilot"
            aria-label="Toggle AI Co-Pilot"
          >
            <Bot className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
