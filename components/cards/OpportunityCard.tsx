'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';

interface OpportunityCardProps {
  opportunity: OpportunityResponseItem;
  isSelected?: boolean;
  onSelect: (opportunity: OpportunityResponseItem) => void;
  isNew?: boolean;
  animateEntrance?: boolean;
}

const TYPE_LABEL: Record<OpportunityResponseItem['type'], string> = {
  business: 'BIZ',
  innovation: 'INNO',
  investment: 'INV',
};

const BAND_STYLE = {
  green: 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-400',
  orange: 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:border-orange-400',
  red: 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:border-red-400',
};

const BAND_LABEL = { green: 'High', orange: 'Medium', red: 'Low' };
export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  isSelected = false,
  onSelect,
  isNew = false,
  animateEntrance = true,
}) => {
  const reducedMotion = useReducedMotion();
  const tag = TYPE_LABEL[opportunity.type] ?? opportunity.type.toUpperCase();
  const score = Math.max(0, Math.min(100, Number(opportunity.probability_score) || 0));
  const band = score > 70 ? 'green' : score > 40 ? 'orange' : 'red';
  const scoreColor = band === 'green' ? 'text-emerald-400' : band === 'orange' ? 'text-orange-400' : 'text-red-400';
  const animated = !reducedMotion && animateEntrance;

  return (
    <motion.button
      type="button"
      layout={animated ? 'position' : false}
      initial={animated ? { opacity: 0, x: isNew ? -28 : 0, y: isNew ? 12 : 8 } : false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0 }}
      transition={animated
        ? { type: 'spring', stiffness: 380, damping: 30, mass: 0.8, opacity: { duration: 0.2 } }
        : { duration: 0 }}
      onClick={() => onSelect(opportunity)}
      className={`w-full min-w-0 text-left bg-slate-900/50 backdrop-blur-md border ${BAND_STYLE[band]} ${
        isSelected ? 'ring-2 ring-slate-200/50 ring-offset-2 ring-offset-slate-950' : ''
      } transition-[border-color,box-shadow] duration-300 cursor-pointer rounded-xl p-4 sm:p-5 flex flex-col gap-3 group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-200`}
      aria-pressed={isSelected}
    >
      {/* Tag row — monospaced metadata, quiet separators */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-400">
        <span className="text-slate-500">{tag}</span>
        {isNew && <span className={`flex items-center gap-1.5 rounded border border-current/20 bg-slate-950/50 px-1.5 py-0.5 text-[9px] ${scoreColor}`}><span className="h-1 w-1 rounded-full bg-current" />NEW SIGNAL</span>}
        {opportunity.dominant_sector && (
          <>
            <span className="text-slate-700">/</span>
            <span className="uppercase tracking-wide">{opportunity.dominant_sector}</span>
          </>
        )}
        {opportunity.primary_region && (
          <>
            <span className="text-slate-700">/</span>
            <span>{opportunity.primary_region}</span>
          </>
        )}

        {/* Viability band and score */}
        <span
          className={`ml-auto px-2 py-0.5 rounded-md font-mono text-[11px] border ${
            band === 'green'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : band === 'orange'
              ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          {BAND_LABEL[band]} · {score.toFixed(1)}%
        </span>
      </div>

      {/* Title + one-line signal */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-slate-200 leading-snug line-clamp-2 group-hover:text-white transition-colors">
          {opportunity.title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {opportunity.short_description}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 font-mono">
        {[
          ['Feasibility', opportunity.feasibility_score],
          ['Impact', opportunity.impact_score],
          ['Time to market', opportunity.time_to_market_score],
        ].map(([label, value]) => <div key={label} className="min-w-0">
          <p className="truncate text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-sm tabular-nums text-slate-200">{Number(value).toFixed(0)}<span className="ml-0.5 text-[10px] text-slate-500">/100</span></p>
        </div>)}
      </div>

      {/* Bottom rail — counts only, no ornament */}
      <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 pt-3 mt-auto border-t border-slate-800">
        <span>{opportunity.source_count} sources</span>
        <span className={`tabular-nums ${scoreColor}`}>{score.toFixed(1)}% viability</span>
      </div>
    </motion.button>
  );
};
