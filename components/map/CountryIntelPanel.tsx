import React from 'react';
import { CountryIntelligenceSummary, OpportunitySummaryItem } from '@/src/types/mapTypes';
import { HeadlineTimeline } from './HeadlineTimeline';
import { MapPin, ShieldCheck, Layers, ChevronRight, Sparkles, X, RotateCcw, Compass, Clock, FileText, Activity } from 'lucide-react';
import { getBandMetadata } from '@/src/utils/geoUtils';
import { getFocusMarket } from '@/src/config/focusMarkets';

interface CountryIntelPanelProps {
  country: CountryIntelligenceSummary;
  onClose: () => void;
  onSelectOpportunity: (opportunity: OpportunitySummaryItem) => void;
  onSelectRegion?: (regionName: string) => void;
  isLoading?: boolean;
  timeWindow?: string;
  onTimeWindowChange?: (tw: string) => void;
}

export const CountryIntelPanel: React.FC<CountryIntelPanelProps> = ({
  country,
  onClose,
  onSelectOpportunity,
  onSelectRegion,
  isLoading = false,
  timeWindow = '7d',
  onTimeWindowChange,
}) => {
  const focusMarket = getFocusMarket(country.code);

  if (isLoading) {
    return (
      <div className="h-full bg-[#080d1a]/95 backdrop-blur-xl border-l border-slate-800 p-6 flex flex-col items-center justify-center text-slate-400 font-mono">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-300">ASSEMBLING DOSSIER BRIEF...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#080d1a]/95 backdrop-blur-xl border-l border-slate-800/80 p-4 lg:p-6 overflow-y-auto flex flex-col text-slate-100 shadow-2xl border-t-2 border-t-sky-500">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 font-mono">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="px-2.5 py-1 bg-[#040711] hover:bg-slate-800 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-800 transition-colors flex items-center"
            title="Return to World View"
            aria-label="Back to World View"
          >
            <RotateCcw className="w-3 h-3 mr-1.5 text-sky-400" />
            Back to World
          </button>
        </div>

        {/* Time Window Selector */}
        {onTimeWindowChange && (
          <div className="flex items-center space-x-1 bg-[#040711] p-1 rounded-lg border border-slate-800 text-[10px]">
            <Clock className="w-3 h-3 text-slate-400 ml-1 mr-0.5" />
            {(['24h', '7d', '30d'] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => onTimeWindowChange(tw)}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  timeWindow === tw ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tw}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          aria-label="Close Country Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Country Name & Header */}
      <div className="mb-5">
        <div className="flex items-center space-x-2 text-[10px] font-mono text-sky-400 uppercase tracking-widest mb-1">
          <FileText className="w-3.5 h-3.5" />
          <span>TACTICAL FIELD DOSSIER · {country.code}</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          {country.name}
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-0.5">{country.region} Regional Intelligence Brief</p>
      </div>

      {/* Overview Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-6 font-mono">
        <div className="bg-[#040711]/90 border border-slate-800/90 rounded-lg p-2.5 text-center">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Total Signals</span>
          <span className="text-base font-extrabold text-sky-400 tabular-nums">{country.totalSignals}</span>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-lg p-2.5 text-center">
          <span className="text-[9px] text-emerald-400 uppercase tracking-wider block">High Viability</span>
          <span className="text-base font-extrabold text-emerald-300 tabular-nums">{country.bandCounts.green}</span>
        </div>
        <div className="bg-amber-950/40 border border-amber-900/60 rounded-lg p-2.5 text-center">
          <span className="text-[9px] text-amber-400 uppercase tracking-wider block">Medium Viability</span>
          <span className="text-base font-extrabold text-amber-300 tabular-nums">{country.bandCounts.orange}</span>
        </div>
      </div>

      {/* Section 1: Hotspots / Concentration Areas */}
      {focusMarket?.hotspots && focusMarket.hotspots.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center text-sky-400">
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              Focus Hotspots ({focusMarket.hotspots.length})
            </span>
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {focusMarket.hotspots.map((hs) => (
              <button
                key={hs.id}
                onClick={() => onSelectRegion?.(hs.name)}
                className="px-2.5 py-1.5 bg-[#040711]/80 hover:bg-[#040711] border border-slate-800 hover:border-sky-500/80 rounded-lg text-slate-200 text-[11px] font-mono font-semibold transition-all flex items-center space-x-1 group"
              >
                <span>{hs.name}</span>
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-sky-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Active Sectors */}
      {country.sectorCounts && Object.keys(country.sectorCounts).length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            Active Sectors
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(country.sectorCounts).map(([sector, count]) => (
              <span
                key={sector}
                className="px-2.5 py-1 bg-[#040711] border border-slate-800 text-slate-200 text-[11px] font-mono rounded-lg capitalize flex items-center"
              >
                {sector} <span className="ml-1 text-[10px] text-sky-400 font-bold tabular-nums">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Opportunities Emerging */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            Emerging Opportunities ({country.opportunities.length})
          </h3>
        </div>

        <div className="space-y-3">
          {country.opportunities.map((opp) => {
            const bandMeta = getBandMetadata(opp.band);
            return (
              <div
                key={opp.id}
                onClick={() => onSelectOpportunity(opp)}
                className="p-3.5 bg-[#040711]/70 hover:bg-[#040711] border border-slate-800/90 hover:border-sky-500/80 rounded-xl transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-2">
                    {opp.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border shrink-0 ${bandMeta.bgClass} ${bandMeta.textClass} ${bandMeta.borderClass}`}
                  >
                    {bandMeta.label}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2.5 leading-relaxed">
                  {opp.short_description}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="capitalize font-medium text-slate-300">
                    Type: <strong className="text-sky-400">{opp.type}</strong>
                  </span>
                  <span className="font-bold text-slate-200">
                    Prob: <span className="text-emerald-400 tabular-nums">{opp.probability_score}%</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Story Clusters */}
      {country.clusters && country.clusters.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
            Story Clusters ({country.clusters.length})
          </h3>
          <div className="space-y-2">
            {country.clusters.map((cluster) => (
              <div
                key={cluster.id}
                onClick={() => onSelectRegion?.(cluster.topic_label || 'Regional Cluster')}
                className="p-3 bg-[#040711]/50 hover:bg-[#040711] border border-slate-800/90 rounded-lg transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
                    {cluster.title}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
                    {cluster.article_count} Articles | Sector: {cluster.dominant_sector}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Headlines */}
      <div>
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
          Live Country Headlines
        </h3>
        <HeadlineTimeline headlines={country.topHeadlines} />
      </div>
    </div>
  );
};
