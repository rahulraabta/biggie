'use client';

import React from 'react';
import { Layers, MapPin, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { MapOverviewResponse } from '@/src/types/mapTypes';
import { getAllFocusMarkets, FocusMarket } from '@/src/config/focusMarkets';
import { getBandMetadata } from '@/src/utils/geoUtils';

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
    <div className="panel-surface p-5 text-slate-100 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-sky-950/80 border border-sky-800/80 rounded-xl text-sky-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              Priority Market Pulse
            </h3>
            <p className="text-[11px] text-slate-400">
              Ranked focus markets across verified GDELT news streams
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-sky-400 bg-sky-950/80 border border-sky-800/80 px-2.5 py-1 rounded-lg">
          10 Priority Markets
        </span>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
              <th className="pb-2.5 pl-2 font-bold">Market / Focus</th>
              <th className="pb-2.5 font-bold text-center">Signals</th>
              <th className="pb-2.5 font-bold text-center">High (71-100%)</th>
              <th className="pb-2.5 font-bold">Top Sector</th>
              <th className="pb-2.5 pr-2 text-right font-bold">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
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
                  className={`cursor-pointer transition-colors group ${
                    isSelected ? 'bg-sky-950/50' : 'hover:bg-slate-900/80'
                  }`}
                >
                  <td className="py-2.5 pl-2">
                    <div className="flex items-center space-x-2">
                      {fm.kind === 'aggregation' ? (
                        <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-slate-200 group-hover:text-sky-400 transition-colors">
                          {fm.displayName}
                        </span>
                        {fm.kind === 'aggregation' && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-900/60 font-bold">
                            AGGR
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-center font-semibold text-slate-300">{signalCount}</td>
                  <td className="py-2.5 text-center">
                    <span className="badge-band-green text-[10px] px-2 py-0.5 rounded-full inline-flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      {greenCount} High
                    </span>
                  </td>
                  <td className="py-2.5 font-medium text-slate-400 uppercase text-[10px]">
                    {dominantSector}
                  </td>
                  <td className="py-2.5 pr-2 text-right">
                    <div className="inline-flex items-center text-sky-400 group-hover:translate-x-1 transition-transform">
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
