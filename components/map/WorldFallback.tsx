'use client';

import React from 'react';
import { OpportunityMapPoint } from '@/src/types/mapTypes';
import { Globe, MapPin, ArrowRight, Layers, ShieldCheck } from 'lucide-react';
import { getBandMetadata } from '@/src/utils/geoUtils';
import { getAllFocusMarkets } from '@/src/config/focusMarkets';

interface WorldFallbackProps {
  points: OpportunityMapPoint[];
  selectedCountryCode: string | null;
  onSelectCountry: (code: string) => void;
  onResetView: () => void;
}

export const WorldFallback: React.FC<WorldFallbackProps> = ({
  points,
  selectedCountryCode,
  onSelectCountry,
  onResetView,
}) => {
  const focusMarkets = getAllFocusMarkets();

  return (
    <div className="w-full h-full bg-slate-950 p-4 lg:p-6 overflow-y-auto flex flex-col text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-4 shadow-xl gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-sky-950/60 border border-sky-800/60 rounded-xl text-sky-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center">
              Global Intelligence Grid (Accessible Mode)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              High-contrast list view for reduced-motion and non-WebGL environments.
            </p>
          </div>
        </div>

        {selectedCountryCode && (
          <button
            onClick={onResetView}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center"
            aria-label="Reset world view"
          >
            ← Reset World View
          </button>
        )}
      </div>

      {/* Priority Focus Markets Bar */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center">
          <Layers className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
          Ten Priority Market Presets
        </h3>
        <div className="flex flex-wrap gap-2">
          {focusMarkets.map((m) => {
            const isSelected = selectedCountryCode === m.isoCode;
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (m.isoCode) onSelectCountry(m.isoCode);
                  else onResetView();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                    : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
                aria-label={`Filter by ${m.displayName}`}
              >
                {m.kind === 'aggregation' ? (
                  <Layers className="w-3 h-3 text-amber-400" />
                ) : (
                  <MapPin className="w-3 h-3 text-sky-400" />
                )}
                <span>{m.displayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Country Signal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
        {points.map((point) => {
          const isSelected = selectedCountryCode === point.countryCode;
          const bandMeta = getBandMetadata(point.topOpportunityBand);

          return (
            <div
              key={point.id}
              onClick={() => onSelectCountry(point.countryCode)}
              className={`group cursor-pointer rounded-2xl p-4 transition-all border flex flex-col justify-between ${
                isSelected
                  ? 'bg-sky-950/40 border-sky-500/80 shadow-lg shadow-sky-950/50 ring-1 ring-sky-500'
                  : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
              }`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCountry(point.countryCode);
                }
              }}
              role="button"
              aria-label={`Select ${point.countryName} signal hub`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-400 transition-colors">
                      {point.countryName} ({point.countryCode})
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${bandMeta.bgClass} ${bandMeta.textClass} ${bandMeta.borderClass}`}
                  >
                    {bandMeta.label}
                  </span>
                </div>

                {/* Dominant Sector & Top Opportunity */}
                <div className="mb-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Top Sector: <span className="text-slate-200">{point.dominantSector}</span>
                  </span>
                  <p className="text-xs text-slate-300 font-medium line-clamp-2">
                    {point.topOpportunityTitle}
                  </p>
                </div>
              </div>

              {/* Footer Metrics */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs">
                  <div className="flex items-center space-x-1 text-slate-400" title="Total News Signals">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>{point.signalCount} Signals</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400" title="High Viability Opportunities">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{point.greenCount} High</span>
                  </div>
                </div>

                <div className="text-xs text-sky-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center">
                  Explore <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
