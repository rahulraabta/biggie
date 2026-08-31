import React from 'react';
import { RegionalIntelligenceSummary, OpportunitySummaryItem } from '@/src/types/mapTypes';
import { HeadlineTimeline } from './HeadlineTimeline';
import { Sparkles, Layers, X, ArrowLeft, RotateCcw, AlertCircle, Clock, FileText } from 'lucide-react';
import { getBandMetadata } from '@/src/utils/geoUtils';

interface RegionIntelPanelProps {
  region: RegionalIntelligenceSummary;
  onClose: () => void;
  onBackToCountry?: () => void;
  onSelectOpportunity: (opportunity: OpportunitySummaryItem) => void;
  isLoading?: boolean;
  timeWindow?: string;
  onTimeWindowChange?: (tw: string) => void;
}

export const RegionIntelPanel: React.FC<RegionIntelPanelProps> = ({
  region,
  onClose,
  onBackToCountry,
  onSelectOpportunity,
  isLoading = false,
  timeWindow = '7d',
  onTimeWindowChange,
}) => {
  const hasSignals =
    (region.opportunities && region.opportunities.length > 0) ||
    (region.clusters && region.clusters.length > 0) ||
    (region.headlines && region.headlines.length > 0);

  if (isLoading) {
    return (
      <div className="h-full bg-[#080d1a]/95 backdrop-blur-xl border-l border-slate-800 p-6 flex flex-col items-center justify-center text-slate-400 font-mono">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-300">FETCHING REGIONAL INTELLIGENCE...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#080d1a]/95 backdrop-blur-xl border-l border-slate-800/80 p-4 lg:p-6 overflow-y-auto flex flex-col text-slate-100 shadow-2xl border-t-2 border-t-sky-500">
      {/* Navigation Breadcrumbs Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 font-mono">
        <div className="flex items-center space-x-1.5">
          {onBackToCountry && (
            <button
              onClick={onBackToCountry}
              className="px-2.5 py-1 bg-[#040711] hover:bg-slate-800 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-800 transition-colors flex items-center"
              aria-label="Back to Country View"
            >
              <ArrowLeft className="w-3 h-3 mr-1 text-sky-400" />
              Back to Country
            </button>
          )}

          <button
            onClick={onClose}
            className="px-2.5 py-1 bg-[#040711] hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-bold rounded-lg border border-slate-800 transition-colors flex items-center"
            aria-label="Reset to World View"
          >
            <RotateCcw className="w-3 h-3 mr-1 text-sky-400" />
            World
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
          aria-label="Close Regional Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Title Header */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 text-[10px] font-mono text-sky-400 uppercase tracking-widest mb-1">
          <FileText className="w-3.5 h-3.5" />
          <span>HOTSPOT DOSSIER · {region.countryCode}</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          {region.regionName}
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-0.5">
          {region.granularity === 'region'
            ? `Verified Region-Level Signals (${region.countryCode})`
            : `Camera & Navigation Anchor (${region.countryCode})`}
        </p>
      </div>

      {/* Anchor Notice Banner */}
      {region.granularity !== 'region' && (
        <div className="p-3 bg-[#040711] border border-slate-800 rounded-lg text-[11px] text-slate-400 mb-4">
          <strong className="text-sky-400 font-semibold font-mono">Navigation Anchor Notice:</strong> Hotspots serve as camera positioning anchors. Signals are aggregated at the country level ({region.countryCode}).
        </div>
      )}

      {/* Empty Signal Fallback Handling */}
      {!hasSignals ? (
        <div className="p-5 bg-[#040711] border border-amber-900/60 rounded-xl text-center my-6 flex flex-col items-center">
          <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
          <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-1">
            No verified signals in the selected period.
          </h4>
          <p className="text-[11px] text-slate-400 max-w-xs mb-4">
            Try expanding your time window filter above or return to country-level intelligence alternatives.
          </p>
          {onBackToCountry && (
            <button
              onClick={onBackToCountry}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-bold rounded-lg transition-all shadow-md"
            >
              View Country-Level Signals ({region.countryCode})
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Regional Opportunities */}
          {region.opportunities && region.opportunities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Regional Opportunities ({region.opportunities.length})
              </h3>
              <div className="space-y-3">
                {region.opportunities.map((opp) => {
                  const bandMeta = getBandMetadata(opp.band);
                  return (
                    <div
                      key={opp.id}
                      onClick={() => onSelectOpportunity(opp)}
                      className="p-3.5 bg-[#040711]/70 hover:bg-[#040711] border border-slate-800/90 hover:border-sky-500/80 rounded-xl transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
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
          )}

          {/* Regional Story Clusters */}
          {region.clusters && region.clusters.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                Regional Story Clusters
              </h3>
              <div className="space-y-2">
                {region.clusters.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-[#040711]/50 border border-slate-800/90 rounded-lg text-xs"
                  >
                    <div className="font-semibold text-slate-200">{c.title}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      Sector: {c.dominant_sector} | {c.article_count} Articles
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regional Headlines */}
          {region.headlines && (
            <div>
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
                Local Regional Headlines
              </h3>
              <HeadlineTimeline headlines={region.headlines} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
