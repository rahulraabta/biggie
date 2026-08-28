'use client';

import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 px-4 lg:px-8 py-3 text-xs text-slate-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Compliance Notice */}
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-slate-300 font-semibold">DPDPA Compliant</strong> — Global news event signals processed in compliance with the Indian Digital Personal Data Protection Act (DPDPA 2023).
          </span>
        </div>

        {/* AI Advice Disclaimer */}
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>AI-generated opportunity intelligence for research & decision support only. Perform independent due diligence.</span>
        </div>
      </div>
    </footer>
  );
};
