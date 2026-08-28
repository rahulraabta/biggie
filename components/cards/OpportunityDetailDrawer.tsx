'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { X, ExternalLink, AlertTriangle, CheckCircle2, Bot, Layers, Globe, Shield, Calendar } from 'lucide-react';

interface OpportunityDetailDrawerProps {
  opportunity: OpportunityResponseItem | null;
  onClose: () => void;
  onSelectForQA: (opportunity: OpportunityResponseItem) => void;
}

export const OpportunityDetailDrawer: React.FC<OpportunityDetailDrawerProps> = ({
  opportunity,
  onClose,
  onSelectForQA,
}) => {
  if (!opportunity) return null;

  const getBandBadge = (band: 'red' | 'orange' | 'green') => {
    switch (band) {
      case 'green':
        return {
          label: 'High Likelihood',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
        };
      case 'orange':
        return {
          label: 'Medium Likelihood',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/40',
        };
      case 'red':
      default:
        return {
          label: 'Low Likelihood',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/40',
        };
    }
  };

  const styling = getBandBadge(opportunity.band);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
        {/* Backdrop click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        {/* Sliding Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/90 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {opportunity.type.toUpperCase()}
                </span>
                {opportunity.dominant_sector && (
                  <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                    {opportunity.dominant_sector.toUpperCase()}
                  </span>
                )}
                {opportunity.primary_region && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                    <Globe className="w-3 h-3 mr-1 text-slate-400" />
                    {opportunity.primary_region}
                  </span>
                )}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styling.bg}`}>
                  {opportunity.probability_score}% • {styling.label}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-100">{opportunity.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Summary */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Executive Summary</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{opportunity.short_description}</p>
            </div>

            {/* Scores Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Viability & Feasibility Breakdown</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Feasibility</span>
                  <span className="text-lg font-extrabold text-emerald-400">{opportunity.feasibility_score}%</span>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Market Impact</span>
                  <span className="text-lg font-extrabold text-sky-400">{opportunity.impact_score}%</span>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Time to Market</span>
                  <span className="text-lg font-extrabold text-purple-400">{opportunity.time_to_market_score}%</span>
                </div>
              </div>
            </div>

            {/* Strategic Analysis */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Detailed Opportunity Analysis</h4>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                {opportunity.long_description}
              </p>
            </div>

            {/* Risks & Assumptions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Risks */}
              <div className="bg-rose-950/10 border border-rose-900/40 p-4 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5" /> Key Execution Risks
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {(opportunity.risks || []).map((risk, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-rose-400 mr-2">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                  {(!opportunity.risks || opportunity.risks.length === 0) && (
                    <li className="text-slate-500 italic">No specific risk flags identified.</li>
                  )}
                </ul>
              </div>

              {/* Core Assumptions */}
              <div className="bg-emerald-950/10 border border-emerald-900/40 p-4 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Underlying Assumptions
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {(opportunity.assumptions || []).map((assump, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-emerald-400 mr-2">✓</span>
                      <span>{assump}</span>
                    </li>
                  ))}
                  {(!opportunity.assumptions || opportunity.assumptions.length === 0) && (
                    <li className="text-slate-500 italic">No explicit assumption dependencies.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Source News Articles */}
            {opportunity.source_articles && opportunity.source_articles.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center">
                  <Layers className="w-4 h-4 mr-1.5 text-sky-400" /> Linked News Source Signals ({opportunity.source_articles.length})
                </h4>
                <div className="space-y-2">
                  {opportunity.source_articles.map((art, idx) => (
                    <a
                      key={idx}
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-850 transition-all text-xs text-slate-300 group"
                    >
                      <span className="truncate max-w-md font-medium text-slate-200 group-hover:text-sky-300">
                        {art.title}
                      </span>
                      <span className="inline-flex items-center text-slate-400 group-hover:text-sky-400">
                        <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {art.country_code}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Set as active context for live market Q&A
            </span>
            <button
              onClick={() => {
                onSelectForQA(opportunity);
                onClose();
              }}
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
            >
              <Bot className="w-4 h-4 mr-2" />
              Ask AI About This Opportunity
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
