'use client';

import React from 'react';
import { ShieldCheck, Info, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="glass-chrome border-t border-white/10 px-4 lg:px-8 py-3.5 text-xs text-slate-400 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
        {/* Compliance Notice */}
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-slate-100 font-bold">DPDPA Compliant</strong> — Global news event signals processed in compliance with the Indian Digital Personal Data Protection Act (DPDPA 2023).
          </span>
        </div>

        {/* Brand & Theme Tag */}
        <div className="flex items-center space-x-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-extrabold text-white">Antigravity Opportunity Radar</span>
          <span className="text-emerald-300">• Cinematic Emerald Venture Engine</span>
        </div>

        {/* AI Advice Disclaimer */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>AI-generated opportunity intelligence for research & decision support only. Perform independent due diligence.</span>
        </div>
      </div>
    </footer>
  );
};
