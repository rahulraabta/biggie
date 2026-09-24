'use client';

import React from 'react';
import { Tag, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="glass-panel p-4 text-slate-100 relative overflow-hidden">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider flex items-center">
          <Sparkles className="w-4 h-4 mr-1.5 text-emerald-400 animate-pulse" />
          <span className="emerald-gradient-text">Active Sector Heatmap</span>
        </h4>
        <span className="text-[10px] font-mono text-slate-500">Click sector to filter grid</span>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-0.5">
        {SECTORS.map((sec) => {
          const isActive = selectedSector === sec.id;
          return (
            <motion.button
              key={sec.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSectorChange(sec.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center space-x-1.5 ring-1 backdrop-blur-md ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 ring-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 ring-white/10 hover:ring-emerald-500/40'
              }`}
              aria-label={`Filter by ${sec.label}`}
            >
              <span>{sec.label}</span>
              <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full font-bold ${
                isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40'
              }`}>
                {sec.count}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
