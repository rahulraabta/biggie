'use client';

import React from 'react';
import { FocusMarket } from '@/src/config/focusMarkets';
import { MapOverviewResponse, OpportunitySummaryItem } from '@/src/types/mapTypes';
import { Layers, MapPin, Sparkles, ArrowRight, ShieldCheck, X, Globe, Compass } from 'lucide-react';
import { getBandMetadata, getCountryCoordinates } from '@/src/utils/geoUtils';

interface AggregationIntelPanelProps {
  market: FocusMarket;
  mapOverview: MapOverviewResponse | null;
  opportunities: OpportunitySummaryItem[];
  onClose: () => void;
  onSelectCountry: (countryCode: string) => void;
  onSelectOpportunity: (opportunity: OpportunitySummaryItem) => void;
  onSelectRegion?: (regionName: string) => void;
}

export const AggregationIntelPanel: React.FC<AggregationIntelPanelProps> = ({
  market,
  mapOverview,
  opportunities,
  onClose,
  onSelectCountry,
  onSelectOpportunity,
  onSelectRegion,
}) => {
  const points = mapOverview?.points || [];

  // Filter points relevant to market kind
  const filteredPoints = React.useMemo(() => {
    if (market.id === 'EU') {
      const euCodes = new Set(['DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'BE', 'EU']);
      return points.filter((p) => euCodes.has(p.countryCode));
    }
    if (market.id === 'ROW') {
      const priorityCodes = new Set(['IN', 'US', 'GB', 'SG', 'AE', 'DE', 'JP']);
      return points.filter((p) => !priorityCodes.has(p.countryCode));
    }
    return points; // GLOBAL
  }, [market.id, points]);

  return (
    <div className="h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800/80 p-4 lg:p-6 overflow-y-auto flex flex-col text-slate-100 shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-950/80 border border-amber-800/80 rounded-xl text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center">
              {market.displayName}
            </h2>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/60 border border-amber-900/60 px-2 py-0.5 rounded">
              Aggregate Regional Radar View
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          aria-label="Close Aggregation Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Description Banner */}
      <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl mb-6 text-xs text-slate-300 leading-relaxed">
        {market.overviewDescription}
      </div>

      {/* Priority Sectors */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
          Priority Market Sectors
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {market.prioritySectors.map((sector) => (
            <span
              key={sector}
              className="px-2.5 py-1 bg-amber-950/30 border border-amber-900/40 text-amber-300 text-[11px] font-semibold rounded-lg capitalize"
            >
              {sector}
            </span>
          ))}
        </div>
      </div>

      {/* Regional Hotspot Anchors if present */}
      {market.hotspots && market.hotspots.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span className="flex items-center">
              <Compass className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
              Regional Hotspot Anchors
            </span>
            <span className="text-[10px] text-slate-400">({market.hotspots.length})</span>
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {market.hotspots.map((hs) => (
              <button
                key={hs.id}
                onClick={() => onSelectRegion?.(hs.name)}
                className="p-2.5 bg-slate-950/50 hover:bg-slate-950 border border-slate-800 hover:border-sky-500/80 rounded-xl transition-all text-left group"
              >
                <div className="font-bold text-xs text-slate-200 group-hover:text-sky-400 transition-colors">
                  {hs.name}
                </div>
                <div className="text-[10px] text-slate-400 capitalize mt-0.5 truncate">
                  {hs.sector}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Countries / Active Signal Hubs */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center">
          <Globe className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
          Active Member Markets ({filteredPoints.length})
        </h3>

        {filteredPoints.length === 0 ? (
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
            No active market signals reported in this aggregation view.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPoints.map((pt) => {
              const bandMeta = getBandMetadata(pt.topOpportunityBand);
              return (
                <div
                  key={pt.id}
                  onClick={() => onSelectCountry(pt.countryCode)}
                  className="p-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-800/80 hover:border-sky-500/80 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-200 group-hover:text-sky-400 transition-colors">
                      {pt.countryName} ({pt.countryCode})
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Sector: <strong className="text-slate-300 uppercase">{pt.dominantSector}</strong>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${bandMeta.bgClass} ${bandMeta.textClass} ${bandMeta.borderClass}`}>
                      {pt.greenCount} High
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top High-Viability Signals */}
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center">
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
          Top Opportunities
        </h3>
        <div className="space-y-3">
          {opportunities.slice(0, 4).map((opp) => {
            const bandMeta = getBandMetadata(opp.band);
            return (
              <div
                key={opp.id}
                onClick={() => onSelectOpportunity(opp)}
                className="p-3.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-sky-500/80 rounded-2xl transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-1">
                    {opp.title}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${bandMeta.bgClass} ${bandMeta.textClass} ${bandMeta.borderClass}`}>
                    {opp.probability_score}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {opp.short_description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
