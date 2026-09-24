'use client';

import React from 'react';
import { Search, RefreshCw, Radio, Filter, Bot, Clock, Sparkles, Compass, Zap } from 'lucide-react';
import { MotionMode, MOTION_MODE_LABELS } from '@/components/globe/motionConfig';
import { motion } from 'framer-motion';

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
  /** Opens the global ⌘K command palette (Search signals...). */
  onOpenCommandPalette?: () => void;
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
  onOpenCommandPalette,
  toggleSidebar,
  toggleQA,
}) => {
  return (
    <header className="sticky top-0 z-40 glass-chrome border-b border-white/10 px-4 lg:px-8 py-3 flex items-center justify-between shadow-lg relative">
      {/* Top Emerald Trace Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

      {/* Left: Brand */}
      <div className="flex items-center space-x-3.5 shrink-0 z-10">
        <motion.div
          whileHover={{ scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 border border-emerald-400/60 flex items-center justify-center text-slate-950 shadow-[0_0_20px_-4px_rgba(16,185,129,0.6)] cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '10s' }} />
          <Radio className="w-3.5 h-3.5 absolute text-emerald-200 animate-ping opacity-75" />
        </motion.div>

        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-lg font-black tracking-tight flex items-center">
              <span className="text-white">Opportunity</span>
              <span className="emerald-gradient-text ml-1.5 font-extrabold">Earth</span>
            </h1>

            <motion.span
              whileHover={{ scale: 1.05 }}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center space-x-1 ${
                sourceMode === 'database'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>{sourceMode === 'database' ? 'LIVE RADAR' : 'DEMO PREVIEW'}</span>
            </motion.span>
          </div>

          <p className="text-[11px] font-medium text-slate-400 flex items-center space-x-1.5 hidden sm:flex">
            <Compass className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Cinematic Geopolitical Venture Intelligence</span>
          </p>
        </div>
      </div>

      {/* Center: Search Field in Cream Surface */}
      <div className="flex-1 max-w-md mx-6 hidden md:block z-10">
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search signals by country, sector, or keyword..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25 transition-all duration-300 backdrop-blur-md"
            aria-label="Search radar signals"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3 z-10">
        {/* Global Command Palette Trigger (⌘K) */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900/50 text-neutral-400 text-xs font-mono hover:text-neutral-100 hover:border-neutral-600 transition-colors"
            title="Search signals (⌘K)"
            aria-label="Open global command palette"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search signals...</span>
            <span className="text-neutral-600">⌘K</span>
          </button>
        )}

        {/* Time Window Selector (Desktop) */}
        {onTimeWindowChange && (
          <div className="hidden xl:flex items-center space-x-1 bg-white/5 p-1 rounded-2xl ring-1 ring-white/10 text-xs font-mono backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-emerald-400 ml-2 mr-1" />
            {(['24h', '7d', '30d'] as const).map((tw) => (
              <motion.button
                key={tw}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTimeWindowChange(tw)}
                className={`px-3 py-1 rounded-xl font-bold transition-all duration-300 ${
                  timeWindow === tw
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                }`}
                aria-label={`Set time window to ${tw}`}
              >
                {tw}
              </motion.button>
            ))}
          </div>
        )}

        {/* Motion Mode Selector (Desktop) */}
        {onMotionModeChange && (
          <div className="hidden md:flex items-center space-x-1 bg-white/5 p-1 rounded-2xl ring-1 ring-white/10 text-xs font-mono backdrop-blur-md">
            {(['full', 'reduced', 'static'] as MotionMode[]).map((mode) => {
              const active = motionMode === mode;
              const meta = MOTION_MODE_LABELS[mode];
              return (
                <button
                  key={mode}
                  onClick={() => onMotionModeChange(mode)}
                  className={`px-2.5 py-1 rounded-xl font-bold capitalize transition-all duration-300 ${
                    active
                      ? mode === 'full'
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : mode === 'reduced'
                        ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
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
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-[0_0_20px_-4px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50"
          aria-label="Refresh Radar Signals"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isLoading ? 'Syncing...' : 'Refresh'}</span>
        </motion.button>

        {/* Mobile Filter Toggle */}
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-2xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 ring-1 ring-white/10 transition-all duration-300"
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
            className="lg:hidden p-2 rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all duration-300"
            title="Toggle Radar Scout AI"
            aria-label="Toggle Radar Scout AI"
          >
            <Bot className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
