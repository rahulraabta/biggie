import React from 'react';
import { CountryIntelligenceSummary, OpportunitySummaryItem } from '@/src/types/mapTypes';
import { HeadlineTimeline } from './HeadlineTimeline';
import { MapPin, ShieldCheck, Layers, ChevronRight, Sparkles, X, RotateCcw, Compass, Clock } from 'lucide-react';
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
      <div className="h-full bg-slate-900/90 backdrop-blur-xl border-l border-slate-800 p-6 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-300">Fetching Country Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800/80 p-4 lg:p-6 overflow-y-auto flex flex-col text-slate-100 shadow-2xl">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors flex items-center"
            title="Return to World View"
            aria-label="Back to World View"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Back to World
          </button>
        </div>

        {/* Time Window Selector */}
        {onTimeWindowChange && (
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
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

      {/* Country Name & Region */}
      <div className="flex items-center space-x-2.5 mb-4">
        <div className="p-2 bg-sky-950/80 border border-sky-800/80 rounded-xl text-sky-400">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center">
            {country.name} ({country.code})
          </h2>
          <p className="text-xs text-slate-400">{country.region} Opportunity Intelligence</p>
        </div>
      </div>

      {/* Overview Metrics Banner */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
          <span className="text-[10px] text-slate-400 font-medium block">Total Signals</span>
          <span className="text-sm font-bold text-sky-400">{country.totalSignals}</span>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-2.5 text-center">
          <span className="text-[10px] text-emerald-400 font-medium block">High (Green)</span>
          <span className="text-sm font-bold text-emerald-300">{country.bandCounts.green}</span>
        </div>
        <div className="bg-amber-950/40 border border-amber-900/60 rounded-xl p-2.5 text-center">
          <span className="text-[10px] text-amber-400 font-medium block">Medium (Orange)</span>
          <span className="text-sm font-bold text-amber-300">{country.bandCounts.orange}</span>
        </div>
      </div>

      {/* Regional Hotspot Navigation Anchors */}
      {focusMarket?.hotspots && focusMarket.hotspots.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center">
              <Compass className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
              Regional Hotspots ({focusMarket.hotspots.length})
            </span>
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {focusMarket.hotspots.map((hs) => (
              <button
                key={hs.id}
                onClick={() => onSelectRegion?.(hs.name)}
                className="px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-sky-500/80 rounded-xl text-slate-200 text-[11px] font-semibold transition-all flex items-center space-x-1 group"
              >
                <span>{hs.name}</span>
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-sky-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top Sector Distribution */}
      {country.sectorCounts && Object.keys(country.sectorCounts).length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            Top Active Sectors
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(country.sectorCounts).map(([sector, count]) => (
              <span
                key={sector}
                className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/80 text-slate-200 text-[11px] font-medium rounded-lg capitalize flex items-center"
              >
                {sector} <span className="ml-1 text-[10px] text-sky-400 font-bold">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Country Opportunities Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            Country Opportunities ({country.opportunities.length})
          </h3>
        </div>

        <div className="space-y-3">
          {country.opportunities.map((opp) => {
            const bandMeta = getBandMetadata(opp.band);
            return (
              <div
                key={opp.id}
                onClick={() => onSelectOpportunity(opp)}
                className="p-3.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-sky-500/80 rounded-2xl transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-2">
                    {opp.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${bandMeta.bgClass} ${bandMeta.textClass} ${bandMeta.borderClass}`}
                  >
                    {bandMeta.label}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2.5">
                  {opp.short_description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="capitalize font-medium text-slate-300">
                    Type: <strong className="text-sky-400">{opp.type}</strong>
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

      {/* Story Clusters Section */}
      {country.clusters && country.clusters.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Story Clusters ({country.clusters.length})
          </h3>
          <div className="space-y-2">
            {country.clusters.map((cluster) => (
              <div
                key={cluster.id}
                onClick={() => onSelectRegion?.(cluster.topic_label || 'Regional Cluster')}
                className="p-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-800/80 rounded-xl transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
                    {cluster.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {cluster.article_count} Articles | Sector: {cluster.dominant_sector}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Headline Events */}
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Live Country Headlines
        </h3>
        <HeadlineTimeline headlines={country.topHeadlines} />
      </div>
    </div>
  );
};
