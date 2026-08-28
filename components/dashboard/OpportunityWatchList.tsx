'use client';

import React from 'react';
import { Sparkles, ShieldCheck, ArrowRight, Clock, Layers } from 'lucide-react';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { OpportunitySummaryItem } from '@/src/types/mapTypes';
import { getBandMetadata } from '@/src/utils/geoUtils';

interface OpportunityWatchListProps {
  opportunities: (OpportunityResponseItem | OpportunitySummaryItem)[];
  onSelectOpportunity: (opp: OpportunityResponseItem | OpportunitySummaryItem) => void;
  isLoading?: boolean;
}

export const OpportunityWatchList: React.FC<OpportunityWatchListProps> = ({
  opportunities,
  onSelectOpportunity,
  isLoading = false,
}) => {
  const topOpps = opportunities.slice(0, 5);

  return (
    <div className="panel-surface p-5 text-slate-100 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              Top Opportunity Watch
            </h3>
            <p className="text-[11px] text-slate-400">
              Highest-viability strategic signals on the radar
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-lg flex items-center">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Top Signals
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#060a12]/60 rounded-xl animate-pulse border border-slate-800/60" />
          ))}
        </div>
      ) : topOpps.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400 bg-[#060a12]/40 rounded-xl border border-slate-800/60">
          No opportunities currently matching radar watch criteria.
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {topOpps.map((opp) => {
            const bandMeta = getBandMetadata(opp.band);
            return (
              <div
                key={opp.id}
                onClick={() => onSelectOpportunity(opp)}
                className="panel-surface-hover p-3.5 bg-[#060a12]/80 border border-slate-800 rounded-xl cursor-pointer transition-all group shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-1">
                    {opp.title}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${bandMeta.bgClass} ${bandMeta.textClass} ${bandMeta.borderClass}`}>
                    {opp.probability_score}% Viability
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                  {opp.short_description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center space-x-2">
                    <span className="capitalize font-semibold text-slate-300">
                      Type: <strong className="text-sky-400">{opp.type}</strong>
                    </span>
                    <span>•</span>
                    <span className="uppercase text-[9px] tracking-wider text-slate-400">
                      {opp.dominant_sector || 'business'}
                    </span>
                  </div>
                  <div className="flex items-center text-sky-400 group-hover:translate-x-1 transition-transform font-semibold">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
