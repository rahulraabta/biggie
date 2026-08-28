'use client';

import React from 'react';
import { Filter, Globe, Layers, ShieldCheck, Tag, ArrowUpDown, RotateCcw } from 'lucide-react';

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
      className={`w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-61px)] overflow-y-auto ${
        isOpenMobile ? 'block fixed inset-y-0 left-0 z-50 pt-16 shadow-2xl' : 'hidden lg:flex'
      }`}
    >
      <div className="p-5 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-sky-400" /> Opportunity Filters
          </h2>
          <button
            onClick={onReset}
            className="text-[11px] text-slate-400 hover:text-sky-400 inline-flex items-center transition-colors"
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </button>
        </div>

        {/* Viability Band Filter */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Viability Band Score
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: 'all', label: 'All Bands' },
              { id: 'green', label: 'Green (71-100%)' },
              { id: 'orange', label: 'Orange (41-70%)' },
              { id: 'red', label: 'Red (0-40%)' },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => onBandChange(b.id)}
                className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all ${
                  selectedBand === b.id
                    ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sector Filter */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1 text-purple-400" /> Dominant Industry Sector
          </label>
          <select
            value={selectedSector}
            onChange={(e) => onSectorChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
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
          <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center">
            <Globe className="w-3.5 h-3.5 mr-1 text-sky-400" /> Geographic Focus
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
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
          <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center">
            <Tag className="w-3.5 h-3.5 mr-1 text-amber-400" /> Opportunity Type
          </label>
          <div className="space-y-1 text-xs">
            {[
              { value: 'all', label: 'All Opportunity Types' },
              { value: 'business', label: 'Business & Commercial Products' },
              { value: 'innovation', label: 'R&D & Tech Innovation' },
              { value: 'investment', label: 'CapEx & Venture Investments' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => onTypeChange(t.value)}
                className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-all ${
                  selectedType === t.value
                    ? 'bg-slate-800 text-sky-300 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Order */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-slate-400" /> Sort Radar Order
          </label>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
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
