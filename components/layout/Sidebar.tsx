'use client';

import React from 'react';
import { Filter, Globe, Layers, ShieldCheck, Tag, ArrowUpDown, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  selectedBand: string;
  onBandChange: (band: string) => void;
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  onReset: () => void;
  isOpenMobile?: boolean;
}

const SECTORS = [
  { value: 'all', label: 'All Sectors' },
  { value: 'technology', label: 'Technology & AI' },
  { value: 'energy', label: 'Energy & CleanTech' },
  { value: 'logistics', label: 'Logistics & Supply Chain' },
  { value: 'fintech', label: 'Fintech & Financials' },
  { value: 'healthtech', label: 'Healthtech & MedTech' },
  { value: 'manufacturing', label: 'Manufacturing & Materials' },
  { value: 'climate', label: 'Climate & Sustainability' },
  { value: 'regulatory', label: 'Regulatory & Trade Policy' },
];

const REGIONS = [
  { value: 'all', label: 'All Regions' },
  { value: 'IN', label: '🇮🇳 India (Priority)' },
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'EU', label: '🇪🇺 European Union' },
  { value: 'GB', label: '🇬🇧 United Kingdom' },
  { value: 'SG', label: '🇸🇬 Singapore' },
  { value: 'AE', label: '🇦🇪 UAE / Middle East' },
  { value: 'GLOBAL', label: '🌐 Global Inter-Region' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  selectedBand,
  onBandChange,
  selectedSector,
  onSectorChange,
  selectedRegion,
  onRegionChange,
  selectedType,
  onTypeChange,
  selectedSort,
  onSortChange,
  onReset,
  isOpenMobile = false,
}) => {
  return (
    <aside
      className={`w-full glass-chrome border-r border-white/10 flex flex-col h-full overflow-y-auto ${
        isOpenMobile ? 'block fixed inset-y-0 left-0 z-50 pt-16 shadow-2xl w-80' : 'flex'
      }`}
    >
      <div className="p-5 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center">
            <Sparkles className="w-4 h-4 mr-2 text-emerald-400 animate-pulse" />
            <span className="emerald-gradient-text font-black">Opportunity Filters</span>
          </h2>
          <button
            onClick={onReset}
            className="text-[11px] font-mono text-slate-500 hover:text-emerald-300 inline-flex items-center transition-colors font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </button>
        </div>

        {/* Viability Band Filter */}
        <div>
          <label className="text-xs font-bold text-slate-100 block mb-2 flex items-center">
            <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-400" /> Viability Band Score
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-white/5 p-1.5 rounded-2xl ring-1 ring-white/10 backdrop-blur-md text-xs">
            {[
              { id: 'all', label: 'All Bands' },
              { id: 'green', label: 'Green (71-100%)' },
              { id: 'orange', label: 'Orange (41-70%)' },
              { id: 'red', label: 'Red (0-40%)' },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => onBandChange(b.id)}
                className={`py-2 px-2 rounded-xl text-center font-bold text-[11px] transition-all duration-300 ${
                  selectedBand === b.id
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sector Filter */}
        <div>
          <label className="text-xs font-bold text-slate-100 block mb-2 flex items-center">
            <Layers className="w-4 h-4 mr-1.5 text-emerald-400" /> Dominant Industry Sector
          </label>
          <select
            value={selectedSector}
            onChange={(e) => onSectorChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25 transition-all duration-300 backdrop-blur-md [&>option]:bg-slate-900 [&>option]:text-slate-100"
          >
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Geographic Region Filter */}
        <div>
          <label className="text-xs font-bold text-slate-100 block mb-2 flex items-center">
            <Globe className="w-4 h-4 mr-1.5 text-emerald-400" /> Geographic Focus
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25 transition-all duration-300 backdrop-blur-md [&>option]:bg-slate-900 [&>option]:text-slate-100"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Opportunity Type Filter */}
        <div>
          <label className="text-xs font-bold text-slate-100 block mb-2 flex items-center">
            <Tag className="w-4 h-4 mr-1.5 text-amber-400" /> Opportunity Type
          </label>
          <div className="space-y-1.5 text-xs font-bold">
            {[
              { value: 'all', label: 'All Opportunity Types' },
              { value: 'business', label: 'Business & Commercial Products' },
              { value: 'innovation', label: 'R&D & Tech Innovation' },
              { value: 'investment', label: 'CapEx & Venture Investments' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => onTypeChange(t.value)}
                className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all duration-300 ${
                  selectedType === t.value
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Order */}
        <div>
          <label className="text-xs font-bold text-slate-100 block mb-2 flex items-center">
            <ArrowUpDown className="w-4 h-4 mr-1.5 text-emerald-400" /> Sort Radar Order
          </label>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25 transition-all duration-300 backdrop-blur-md [&>option]:bg-slate-900 [&>option]:text-slate-100"
          >
            <option value="highest_probability">Highest Probability (%)</option>
            <option value="most_recent">Most Recent Signal</option>
            <option value="impact">Highest Market Impact</option>
          </select>
        </div>
      </div>
    </aside>
  );
};
