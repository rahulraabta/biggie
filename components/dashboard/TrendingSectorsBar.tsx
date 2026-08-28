'use client';

import React from 'react';
import { Tag, Sparkles } from 'lucide-react';

interface TrendingSectorsBarProps {
  selectedSector: string;
  onSectorChange: (sector: string) => void;
}

const SECTORS = [
  { id: 'all', label: 'All Sectors', count: 85 },
  { id: 'energy', label: 'Clean Energy & Microgrids', count: 24 },
  { id: 'technology', label: 'AI & Cloud Infrastructure', count: 22 },
  { id: 'fintech', label: 'Digital Trade & Factoring', count: 14 },
  { id: 'logistics', label: 'Autonomous Freight & Ports', count: 12 },
  { id: 'manufacturing', label: 'Industrial Robotics & OSAT', count: 8 },
  { id: 'biotech', label: 'Pharma & Genomics', count: 5 },
];

export const TrendingSectorsBar: React.FC<TrendingSectorsBarProps> = ({
  selectedSector,
  onSectorChange,
}) => {
  return (
    <div className="panel-surface p-4 text-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center">
          <Tag className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
          Active Sector Heatmap
        </h4>
        <span className="text-[10px] text-slate-400">Click sector to filter grid</span>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
        {SECTORS.map((sec) => {
          const isActive = selectedSector === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => onSectorChange(sec.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 border ${
                isActive
                  ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/20'
                  : 'bg-[#060a12]/80 hover:bg-[#131f33] text-slate-300 border-slate-800'
              }`}
              aria-label={`Filter by ${sec.label}`}
            >
              <span>{sec.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isActive ? 'bg-sky-700 text-white' : 'bg-slate-800 text-sky-400 border border-sky-900/60'
              }`}>
                {sec.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
