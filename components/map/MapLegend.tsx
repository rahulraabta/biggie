import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const MapLegend: React.FC = () => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass-panel rounded-2xl p-3.5 text-xs shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] space-y-2.5 max-w-xs"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px] flex items-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-1 animate-pulse" />
          Viability Bands
        </span>
        <span className="text-[10px] text-slate-500 font-mono">Score Range</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center space-x-1.5 bg-emerald-500/10 ring-1 ring-emerald-500/40 rounded-xl p-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-emerald-300 text-[10px]">High</div>
            <div className="text-[9px] text-slate-500 font-mono">71-100%</div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-amber-500/10 ring-1 ring-amber-500/40 rounded-xl p-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="font-bold text-amber-300 text-[10px]">Medium</div>
            <div className="text-[9px] text-slate-500 font-mono">41-70%</div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-rose-500/10 ring-1 ring-rose-500/40 rounded-xl p-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <div>
            <div className="font-bold text-rose-300 text-[10px]">Low</div>
            <div className="text-[9px] text-slate-500 font-mono">0-40%</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
        <span>Node Size = Signal Density</span>
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      </div>
    </motion.div>
  );
};
