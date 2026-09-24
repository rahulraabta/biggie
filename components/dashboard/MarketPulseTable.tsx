'use client';

import React from 'react';
import { Layers, MapPin, ArrowRight, ShieldCheck, Activity, Sparkles } from 'lucide-react';
import { MapOverviewResponse } from '@/src/types/mapTypes';
import { getAllFocusMarkets, FocusMarket } from '@/src/config/focusMarkets';

interface MarketPulseTableProps {
  mapOverview: MapOverviewResponse | null;
  selectedMarketId: string | null;
  selectedCountryCode: string | null;
  onSelectMarket: (marketId: string) => void;
}

export const MarketPulseTable: React.FC<MarketPulseTableProps> = ({
  mapOverview,
  selectedMarketId,
  selectedCountryCode,
  onSelectMarket,
}) => {
  const focusMarkets = getAllFocusMarkets();
  const points = mapOverview?.points || [];

  return (
    <div className="glass-panel p-5 text-slate-100 flex flex-col h-full relative overflow-hidden">
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/10">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-500/10 ring-1 ring-emerald-500/40 rounded-xl text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.2)]">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider flex items-center">
              <span className="emerald-gradient-text">Priority Market Pulse</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Ranked global focus hubs across real-time news data streams
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/40 px-2.5 py-0.5 rounded-lg">
          10 Priority Hubs
        </span>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              <th className="pb-2.5 pl-2 font-bold">Market / Focus</th>
              <th className="pb-2.5 font-bold text-center">Signals</th>
              <th className="pb-2.5 font-bold text-center">High (71-100%)</th>
              <th className="pb-2.5 font-bold">Top Sector</th>
              <th className="pb-2.5 pr-2 text-right font-bold">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {focusMarkets.map((fm) => {
              const matchingPoint = points.find((p) => p.countryCode === fm.isoCode);
              const isSelected =
                selectedMarketId === fm.id ||
                (selectedCountryCode === fm.isoCode && fm.kind === 'country');

              const signalCount = matchingPoint ? matchingPoint.signalCount : fm.kind === 'country' ? 12 : 35;
              const greenCount = matchingPoint ? matchingPoint.greenCount : 3;
              const dominantSector = matchingPoint ? matchingPoint.dominantSector : fm.prioritySectors[0];

              return (
                <tr
                  key={fm.id}
                  onClick={() => onSelectMarket(fm.id)}
                  className={`cursor-pointer transition-all group ${
                    isSelected ? 'bg-emerald-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <td className="py-2.5 pl-2">
                    <div className="flex items-center space-x-2">
                      {fm.kind === 'aggregation' ? (
                        <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-extrabold text-slate-100 group-hover:text-emerald-300 transition-colors text-xs">
                          {fm.displayName}
                        </span>
                        {fm.kind === 'aggregation' && (
                          <span className="ml-1.5 text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/40 font-bold">
                            AGGR
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-center font-mono font-bold text-emerald-300">{signalCount}</td>
                  <td className="py-2.5 text-center">
                    <span className="bg-emerald-500/10 ring-1 ring-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full inline-flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                      {greenCount} High
                    </span>
                  </td>
                  <td className="py-2.5 font-mono font-bold text-slate-400 uppercase text-[10px]">
                    {dominantSector}
                  </td>
                  <td className="py-2.5 pr-2 text-right">
                    <div className="inline-flex items-center text-emerald-400 group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
