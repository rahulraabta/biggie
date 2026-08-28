'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { X, ExternalLink, AlertTriangle, CheckCircle2, Bot, Layers, Globe, ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react';
import { getBandMetadata } from '@/src/utils/geoUtils';

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

  const bandMeta = getBandMetadata(opportunity.band);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex justify-end">
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
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-2xl bg-[#080d1a] border-l border-slate-800/90 shadow-2xl h-full flex flex-col z-10 text-slate-100"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-[#0e1726]/95 backdrop-blur-xl">
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
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${bandMeta.bgClass} ${bandMeta.textClass} ${bandMeta.borderClass}`}>
                  {opportunity.probability_score}% • {bandMeta.label}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-100 leading-snug">{opportunity.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="Close Opportunity Details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Overview */}
            <div className="bg-[#060a12] rounded-xl p-4 border border-slate-800">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-400 mb-2 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5" /> Overview & Strategic Context
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">{opportunity.short_description}</p>
            </div>

            {/* Score Breakdown */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Score Breakdown</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#060a12]/80 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Feasibility</span>
                  <span className="text-lg font-extrabold text-emerald-400">{opportunity.feasibility_score}%</span>
                </div>
                <div className="bg-[#060a12]/80 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Market Impact</span>
                  <span className="text-lg font-extrabold text-sky-400">{opportunity.impact_score}%</span>
                </div>
                <div className="bg-[#060a12]/80 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Time to Market</span>
                  <span className="text-lg font-extrabold text-purple-400">{opportunity.time_to_market_score}%</span>
                </div>
              </div>
            </div>

            {/* Detailed Analysis / Drivers */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Detailed Opportunity Drivers</h4>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-[#060a12]/50 p-4 rounded-xl border border-slate-800/80">
                {opportunity.long_description}
              </p>
            </div>

            {/* Risks & Assumptions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Execution Risks */}
              <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-xl">
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
              <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-xl">
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

            {/* Suggested Validation Steps */}
            <div className="bg-[#060a12] p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-400 mb-2 flex items-center">
                <HelpCircle className="w-4 h-4 mr-1.5" /> Suggested 90-Day Validation Steps
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-xs">
                <li>Verify local regulatory policies, tariff credits, and CapEx subsidy eligibility.</li>
                <li>Conduct preliminary off-take customer interviews and supplier capacity audits.</li>
                <li>Establish baseline unit economics and regulatory clearance timelines.</li>
              </ol>
            </div>

            {/* Linked Source Articles */}
            {opportunity.source_articles && opportunity.source_articles.length > 0 && (
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center">
                  <Layers className="w-4 h-4 mr-1.5 text-sky-400" /> Linked News Source Signals ({opportunity.source_articles.length})
                </h4>
                <div className="space-y-2">
                  {opportunity.source_articles.map((art, idx) => (
                    <a
                      key={idx}
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-[#060a12]/80 border border-slate-800 hover:border-sky-500/50 hover:bg-[#131f33] transition-all text-xs text-slate-300 group"
                    >
                      <span className="truncate max-w-md font-medium text-slate-200 group-hover:text-sky-300">
                        {art.title}
                      </span>
                      <span className="inline-flex items-center text-slate-400 group-hover:text-sky-400 shrink-0 ml-2">
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

            {/* AI Disclaimer Notice */}
            <div className="p-3 bg-[#060a12] border border-amber-900/50 rounded-xl text-[11px] text-slate-400 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-slate-200 font-semibold">AI Disclaimer:</strong> Model-generated market intelligence from public GDELT news. Not financial, investment, or legal advice.
              </span>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 border-t border-slate-800 bg-[#0e1726]/95 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Bind context into AI Co-Pilot
            </span>
            <button
              onClick={() => {
                onSelectForQA(opportunity);
                onClose();
              }}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shadow-lg shadow-sky-600/20 transition-all"
            >
              <Bot className="w-4 h-4 mr-2" />
              Ask AI Co-Pilot
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
