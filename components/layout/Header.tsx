'use client';

import React from 'react';
import { Search, RefreshCw, Radio, Filter, Bot, Clock, Globe } from 'lucide-react';
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
    <header className="sticky top-0 z-40 bg-[#040711]/95 border-b border-slate-800/90 backdrop-blur-2xl px-4 lg:px-8 py-2.5 flex items-center justify-between shadow-2xl">
      {/* Left: Tactical Control Room Brand */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="w-8 h-8 rounded-lg border border-sky-500/40 bg-slate-900/90 flex items-center justify-center text-sky-400 shadow-md">
          <Radio className="w-4 h-4 animate-pulse text-sky-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center">
              Opportunity <span className="text-sky-400 ml-1.5">Earth</span>
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                sourceMode === 'database'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
              }`}
            >
              {sourceMode === 'database' ? 'LIVE RADAR' : 'DEMO PREVIEW'}
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest hidden sm:block">
            Geopolitical Signal & Market Entry Control Desk
          </p>
        </div>
      </div>

      {/* Center: Search Field */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search signals by country, sector, or keyword..."
            className="w-full pl-9 pr-4 py-1.5 bg-[#090e1c] border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/80 transition-all"
            aria-label="Search radar signals"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Time Window Selector (Desktop) */}
        {onTimeWindowChange && (
          <div className="hidden xl:flex items-center space-x-1 bg-[#090e1c] p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            {(['24h', '7d', '30d'] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => onTimeWindowChange(tw)}
                className={`px-2.5 py-0.5 rounded font-bold transition-all ${
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
          <div className="hidden md:flex items-center space-x-1 bg-[#090e1c] p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
            {(['full', 'reduced', 'static'] as MotionMode[]).map((mode) => {
              const active = motionMode === mode;
              const meta = MOTION_MODE_LABELS[mode];
              return (
                <button
                  key={mode}
                  onClick={() => onMotionModeChange(mode)}
                  className={`px-2.5 py-0.5 rounded font-bold capitalize transition-all ${
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

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#090e1c] hover:bg-slate-800 text-slate-200 text-xs font-mono font-bold border border-slate-800 shadow-sm transition-all disabled:opacity-50"
          aria-label="Refresh Radar Signals"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isLoading ? 'Updating...' : 'Refresh'}</span>
        </button>

        {/* Mobile Filter Toggle */}
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg bg-[#090e1c] text-slate-300 hover:text-slate-100 border border-slate-800 transition-colors"
            title="Toggle Filter Sidebar"
            aria-label="Toggle Filter Sidebar"
          >
            <Filter className="w-4 h-4" />
          </button>
        )}

        {/* Mobile AI Desk Toggle */}
        {toggleQA && (
          <button
            onClick={toggleQA}
            className="lg:hidden p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors"
            title="Toggle Analyst Desk"
            aria-label="Toggle Analyst Desk"
          >
            <Bot className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
