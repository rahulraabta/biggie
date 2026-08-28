'use client';

import React from 'react';
import { Search, RefreshCw, Sparkles, Filter, Bot, BarChart2 } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  toggleSidebar?: () => void;
  toggleQA?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isLoading = false,
  toggleSidebar,
  toggleQA,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 lg:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Branding */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-sky-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-sky-400" />
          </div>
        </div>
        <div>
          <h1 className="text-base font-extrabold text-slate-100 tracking-tight flex items-center">
            Antigravity <span className="text-sky-400 ml-1.5 font-normal">Opportunity Radar</span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            GDELT News-to-Opportunities Intelligence System
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
            placeholder="Search opportunities by keyword, sector, or region..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/80 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Mobile Filter Toggle Button */}
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-750 transition-colors"
            title="Toggle Filter Sidebar"
          >
            <Filter className="w-4 h-4" />
          </button>
        )}

        {/* Refresh Pipeline Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700/60 shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh Radar'}
        </button>

        {/* Mobile AI Panel Toggle */}
        {toggleQA && (
          <button
            onClick={toggleQA}
            className="lg:hidden p-2 rounded-xl bg-sky-600 text-white hover:bg-sky-500 transition-colors"
            title="Toggle AI Assistant"
          >
            <Bot className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
