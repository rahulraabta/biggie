import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

export const MapLegend: React.FC = () => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs shadow-lg space-y-2 max-w-xs">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
        <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
          Viability Bands
        </span>
        <span className="text-[10px] text-slate-500">Score Range</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div className="flex items-center space-x-1.5 bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div>
            <div className="font-semibold text-emerald-300 text-[10px]">High</div>
            <div className="text-[9px] text-slate-400">71-100%</div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-amber-950/40 border border-amber-900/50 rounded-lg p-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div>
            <div className="font-semibold text-amber-300 text-[10px]">Medium</div>
            <div className="text-[9px] text-slate-400">41-70%</div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-rose-950/40 border border-rose-900/50 rounded-lg p-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <div>
            <div className="font-semibold text-rose-300 text-[10px]">Low</div>
            <div className="text-[9px] text-slate-400">0-40%</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
        <span>Node Size = Signal Density</span>
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-sky-400 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};
