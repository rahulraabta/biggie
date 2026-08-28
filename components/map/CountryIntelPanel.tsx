import React from 'react';
import { CountryIntelligenceSummary, OpportunitySummaryItem } from '@/src/types/mapTypes';
import { HeadlineTimeline } from './HeadlineTimeline';
import { MapPin, ShieldCheck, Layers, ChevronRight, Sparkles, X, RotateCcw, Compass, Clock, FileText } from 'lucide-react';
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
      <div className="h-full bg-[#090e1c]/95 backdrop-blur-xl border-l border-slate-800 p-6 flex flex-col items-center justify-center text-slate-400 font-mono-technical">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-300">Assembling Field Intelligence Brief...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#090e1c]/95 backdrop-blur-xl border-l border-slate-800/80 p-4 lg:p-6 overflow-y-auto flex flex-col text-slate-100 shadow-2xl border-t-2 border-t-orange-600">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 font-mono-technical">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="px-2.5 py-1 bg-[#050811] hover:bg-slate-800 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-800 transition-colors flex items-center"
            title="Return to World View"
            aria-label="Back to World View"
          >
            <RotateCcw className="w-3 h-3 mr-1 text-orange-500" />
            Back to World
          </button>
        </div>

        {/* Time Window Selector */}
        {onTimeWindowChange && (
          <div className="flex items-center space-x-1 bg-[#050811] p-1 rounded-lg border border-slate-800 text-[10px]">
            <Clock className="w-3 h-3 text-slate-400 ml-1 mr-0.5" />
            {(['24h', '7d', '30d'] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => onTimeWindowChange(tw)}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  timeWindow === tw ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'
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

      {/* Country Name & Serif Title */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 text-[10px] font-mono-technical text-orange-500 uppercase tracking-widest mb-1">
          <FileText className="w-3.5 h-3.5" />
          <span>FIELD DOSSIER · {country.code}</span>
        </div>
        <h2 className="text-2xl font-serif-display font-normal text-slate-100">
          {country.name}
        </h2>
        <p className="text-xs font-sans-technical text-slate-400 mt-0.5">{country.region} Regional Intelligence Brief</p>
      </div>

      {/* Overview Metrics Banner */}
      <div className="grid grid-cols-3 gap-2 mb-6 font-mono-technical">
        <div className="bg-[#050811]/90 border border-slate-800 rounded-lg p-2.5 text-center">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Total Signals</span>
          <span className="text-base font-extrabold text-orange-400">{country.totalSignals}</span>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-lg p-2.5 text-center">
          <span className="text-[9px] text-emerald-400 uppercase tracking-wider block">High (Green)</span>
          <span className="text-base font-extrabold text-emerald-300">{country.bandCounts.green}</span>
        </div>
        <div className="bg-amber-950/40 border border-amber-900/60 rounded-lg p-2.5 text-center">
          <span className="text-[9px] text-amber-400 uppercase tracking-wider block">Medium (Orange)</span>
          <span className="text-base font-extrabold text-amber-300">{country.bandCounts.orange}</span>
        </div>
      </div>

      {/* Section 1: Where Attention Is Concentrating (Hotspots) */}
      {focusMarket?.hotspots && focusMarket.hotspots.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-mono-technical font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center text-orange-400">
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              Where Attention Is Concentrating ({focusMarket.hotspots.length})
            </span>
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {focusMarket.hotspots.map((hs) => (
              <button
                key={hs.id}
                onClick={() => onSelectRegion?.(hs.name)}
                className="px-2.5 py-1.5 bg-[#050811]/80 hover:bg-[#050811] border border-slate-800 hover:border-orange-500/80 rounded-lg text-slate-200 text-[11px] font-sans-technical font-semibold transition-all flex items-center space-x-1 group"
              >
                <span>{hs.name}</span>
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-orange-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: What Is Moving (Sectors) */}
      {country.sectorCounts && Object.keys(country.sectorCounts).length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-mono-technical font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            What Is Moving (Active Sectors)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(country.sectorCounts).map(([sector, count]) => (
              <span
                key={sector}
                className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-200 text-[11px] font-mono-technical rounded-lg capitalize flex items-center"
              >
                {sector} <span className="ml-1 text-[10px] text-orange-400 font-bold">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Opportunities Emerging */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono-technical font-bold text-slate-300 uppercase tracking-wider flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-orange-400" />
            Opportunities Emerging ({country.opportunities.length})
          </h3>
        </div>

        <div className="space-y-3">
          {country.opportunities.map((opp) => {
            const bandMeta = getBandMetadata(opp.band);
            return (
              <div
                key={opp.id}
                onClick={() => onSelectOpportunity(opp)}
                className="p-3.5 bg-[#050811]/70 hover:bg-[#050811] border border-slate-800/80 hover:border-orange-500/80 rounded-xl transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold font-sans-technical text-slate-100 group-hover:text-orange-400 transition-colors line-clamp-2">
                    {opp.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono-technical font-bold border shrink-0 ${bandMeta.bgClass} ${bandMeta.textClass} ${bandMeta.borderClass}`}
                  >
                    {bandMeta.label}
                  </span>
                </div>

                <p className="text-[11px] font-sans-technical text-slate-400 line-clamp-2 mb-2.5 leading-relaxed">
                  {opp.short_description}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono-technical text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="capitalize font-medium text-slate-300">
                    Type: <strong className="text-orange-400">{opp.type}</strong>
                  </span>
                  <span className="font-bold text-slate-200">
                    Prob: <span className="text-emerald-400">{opp.probability_score}%</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Signals Worth Following (Clusters & Headlines) */}
      {country.clusters && country.clusters.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-mono-technical font-bold text-slate-300 uppercase tracking-wider mb-3">
            Story Clusters ({country.clusters.length})
          </h3>
          <div className="space-y-2">
            {country.clusters.map((cluster) => (
              <div
                key={cluster.id}
                onClick={() => onSelectRegion?.(cluster.topic_label || 'Regional Cluster')}
                className="p-3 bg-[#050811]/40 hover:bg-[#050811] border border-slate-800/80 rounded-lg transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-xs font-sans-technical font-semibold text-slate-200 group-hover:text-orange-400 transition-colors">
                    {cluster.title}
                  </h4>
                  <span className="text-[10px] font-mono-technical text-slate-400 mt-0.5 block">
                    {cluster.article_count} Articles | Sector: {cluster.dominant_sector}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Headline Events */}
      <div>
        <h3 className="text-xs font-mono-technical font-bold text-slate-300 uppercase tracking-wider mb-3">
          Live Country Headlines
        </h3>
        <HeadlineTimeline headlines={country.topHeadlines} />
      </div>
    </div>
  );
};
