'use client';

import React, { useMemo } from 'react';
import { Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { OpportunitySummaryItem } from '@/src/types/mapTypes';
import { motion } from 'framer-motion';

interface OpportunityWatchListProps {
  opportunities: (OpportunityResponseItem | OpportunitySummaryItem)[];
  onSelectOpportunity: (opp: OpportunityResponseItem | OpportunitySummaryItem) => void;
  isLoading?: boolean;
  /** Active sector filter; 'all', 'All Sectors', or empty means show everything. */
  selectedSector?: string;
  /** Active focus market (country ISO code or market id); null/'GLOBAL' means no market. */
  selectedMarket?: string | null;
}

/**
 * Normalized sector for an item across API shapes: DB rows carry `sector`
 * (aliased from story_clusters.dominant_sector) while mock/summary items
 * carry `dominant_sector`. Falls back to 'general' when both are missing.
 */
function getSector(opp: OpportunityResponseItem | OpportunitySummaryItem): string {
  const raw = (opp as OpportunityResponseItem).sector || opp.dominant_sector || '';
  const normalized = String(raw).trim().toLowerCase();
  return normalized || 'general';
}

/** Region/market code across API shapes (region alias or primary_region). */
function getMarketCode(opp: OpportunityResponseItem | OpportunitySummaryItem): string {
  const raw = (opp as OpportunityResponseItem).region || opp.primary_region || '';
  return String(raw).trim().toLowerCase();
}

export const OpportunityWatchList: React.FC<OpportunityWatchListProps> = ({
  opportunities,
  onSelectOpportunity,
  isLoading = false,
  selectedSector,
  selectedMarket,
}) => {
  // Relaxed sector predicate: UI sector labels ("Digital Trade & Factoring")
  // rarely equal DB sector values ("logistics", "business") — the heatmap
  // counts clusters while opportunities carry coarse sectors. Matching is
  // therefore three-tier: direct containment either way, then keyword
  // overlap across sector / title / description / cluster title.
  const matchesSector = useMemo(() => {
    return (opp: OpportunityResponseItem | OpportunitySummaryItem) => {
      if (!selectedSector || selectedSector === 'All Sectors') return true;

      const target = selectedSector.toLowerCase();
      const oppSector = getSector(opp);
      const clusterTitle = String((opp as OpportunityResponseItem).cluster_title || '').toLowerCase();
      const desc = String(opp.short_description || '').toLowerCase();
      const title = String(opp.title || '').toLowerCase();

      // Direct sector name match (substring in either direction)
      if (oppSector !== 'general' && (oppSector.includes(target) || target.includes(oppSector))) {
        return true;
      }

      // Keyword fallback: significant words of the UI label matched against
      // every text field the item carries. Words shorter than 4 chars are
      // dropped (e.g. "IN", "and") so market codes never masquerade as sectors.
      const keywords = target.split(/[\s&,/]+/).filter((w: string) => w.length > 3);
      return keywords.some(
        (kw) =>
          oppSector.includes(kw) ||
          title.includes(kw) ||
          desc.includes(kw) ||
          clusterTitle.includes(kw)
      );
    };
  }, [selectedSector]);

  // Fail-safe filtering: each dimension is a no-op when unset or at its
  // sentinel value. Market matching stays an exact region-code comparison
  // (see getMarketCode) — the heatmap desync is a sector-vocabulary problem.
  const visibleOpportunities = useMemo(() => {
    if (!opportunities || opportunities.length === 0) return [];

    // In this app the "no market" sentinel is null/'GLOBAL' (the focus-market
    // nav uses ISO codes), and items carry region codes — there is no `country`
    // field on either API shape, so the market comparison runs on region.
    const marketActive = Boolean(selectedMarket) && selectedMarket !== 'GLOBAL';

    return opportunities.filter((opp) => {
      // 1. Sector filter (relaxed — keyword-tolerant across text fields)
      // 2. Market/Country filter (region code, e.g. 'IN')
      const matchesMarket = !marketActive || getMarketCode(opp) === selectedMarket!.toLowerCase();

      return matchesSector(opp) && matchesMarket;
    });
  }, [opportunities, matchesSector, selectedMarket]);

  // If the filter yields 0 results, fall back to showing all opportunities so
  // the board is never empty — an active country/sector target can never zero
  // the board. (Aggregation markets whose ids aren't ISO codes match no rows,
  // so they land on this fallback.) The pill below surfaces the fallback
  // instead of silently masking it.
  const fallbackEngaged = visibleOpportunities.length === 0 && opportunities.length > 0;
  const displayList = fallbackEngaged ? opportunities : visibleOpportunities;
  const topOpps = displayList.slice(0, 5);

  return (
    <div className="glass-panel p-5 text-slate-100 flex flex-col h-full relative overflow-hidden">
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/10">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-500/10 ring-1 ring-emerald-500/40 rounded-xl text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.2)]">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider flex items-center">
              <span className="emerald-gradient-text">Top Opportunity Watch</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Highest-viability strategic signals on the radar
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/40 px-2.5 py-0.5 rounded-lg flex items-center">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
          Top Signals
        </span>
      </div>

      {fallbackEngaged && !isLoading && (
        <div className="mb-3">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 ring-1 ring-amber-500/40 px-2.5 py-1 rounded-lg"
            role="status"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            Showing all active signals
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2.5 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse ring-1 ring-white/5" />
          ))}
        </div>
      ) : topOpps.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400 bg-white/5 rounded-2xl ring-1 ring-white/10 font-medium">
          No opportunities currently matching radar watch criteria.
        </div>
      ) : (
        <div className="space-y-2.5 flex-1">
          {topOpps.map((opp) => {
            return (
              <motion.div
                key={opp.id}
                whileHover={{ scale: 1.015, x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectOpportunity(opp)}
                className="p-3.5 bg-white/5 ring-1 ring-white/10 hover:ring-emerald-500/40 hover:bg-white/10 rounded-2xl cursor-pointer transition-all duration-300 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-extrabold text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {opp.title}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ring-1 shrink-0 ${
                    opp.band === 'green'
                      ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/40'
                      : opp.band === 'orange'
                      ? 'bg-amber-500/10 text-amber-300 ring-amber-500/40'
                      : 'bg-rose-500/10 text-rose-300 ring-rose-500/40'
                  }`}>
                    {opp.probability_score}% Viability
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 font-medium">
                  {opp.short_description}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-white/10">
                  <div className="flex items-center space-x-2">
                    <span className="capitalize font-bold text-slate-300">
                      Type: <strong className="text-emerald-300">{opp.type}</strong>
                    </span>
                    <span>•</span>
                    <span className="uppercase text-[9px] tracking-wider text-slate-500 font-bold">
                      {getSector(opp)}
                    </span>
                  </div>
                  <div className="flex items-center text-emerald-300 group-hover:translate-x-1 transition-transform font-bold">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
