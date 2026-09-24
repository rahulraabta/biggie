'use client';

import React from 'react';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';

interface OpportunityCardProps {
  opportunity: OpportunityResponseItem;
  isSelected?: boolean;
  onSelect: (opportunity: OpportunityResponseItem) => void;
}

const TYPE_LABEL: Record<OpportunityResponseItem['type'], string> = {
  business: 'BIZ',
  innovation: 'INNO',
  investment: 'INV',
};

/**
 * High-density dossier card — Linear/Zave-style: flat neutral canvas,
 * monospaced metadata, one quiet feasibility signal. No glow theatrics;
 * selection is a border state, interaction is a single click into the drawer.
 */
export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  isSelected = false,
  onSelect,
}) => {
  const tag = TYPE_LABEL[opportunity.type] ?? opportunity.type.toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onSelect(opportunity)}
      className={`w-full text-left bg-neutral-900/60 border ${
        isSelected ? 'border-neutral-500' : 'border-neutral-800 hover:border-neutral-600'
      } transition-colors cursor-pointer rounded-lg p-4 flex flex-col gap-3 group focus:outline-none focus-visible:border-neutral-500`}
      aria-pressed={isSelected}
    >
      {/* Tag row — monospaced metadata, quiet separators */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
        <span className="text-neutral-500">{tag}</span>
        {opportunity.dominant_sector && (
          <>
            <span className="text-neutral-700">/</span>
            <span className="uppercase tracking-wide">{opportunity.dominant_sector}</span>
          </>
        )}
        {opportunity.primary_region && (
          <>
            <span className="text-neutral-700">/</span>
            <span>{opportunity.primary_region}</span>
          </>
        )}

        {/* Feasibility pill — the one signal, no glow */}
        <span
          className={`ml-auto px-2 py-0.5 rounded-md font-mono text-[11px] border ${
            opportunity.band === 'green'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : opportunity.band === 'orange'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {opportunity.feasibility_score}%
        </span>
      </div>

      {/* Title + one-line signal */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium text-neutral-100 leading-snug line-clamp-2 group-hover:text-white transition-colors">
          {opportunity.title}
        </h3>
        <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
          {opportunity.short_description}
        </p>
      </div>

      {/* Bottom rail — counts only, no ornament */}
      <div className="flex items-center justify-between font-mono text-[11px] text-neutral-500 pt-1">
        <span>{opportunity.source_count} sources</span>
        <span className="text-neutral-600">{opportunity.probability_score}% prob</span>
      </div>
    </button>
  );
};
