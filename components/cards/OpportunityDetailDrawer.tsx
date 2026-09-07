'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Bot,
  Layers,
  Globe,
  Sparkles,
  Target,
  Lightbulb,
  Building2,
  Flame,
  Zap,
  Share2,
  Check,
  Link2,
} from 'lucide-react';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { getBandMetadata } from '@/src/utils/geoUtils';

interface OpportunityDetailDrawerProps {
  opportunity: OpportunityResponseItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectForQA: (opportunity: OpportunityResponseItem) => void;
}

// Brand marks for the share rail (no icon-library equivalents exist).
const X_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LINKEDIN_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125M7.119 20.452H3.554V9h3.565zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.22 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
  </svg>
);

export const OpportunityDetailDrawer: React.FC<OpportunityDetailDrawerProps> = ({
  opportunity,
  isOpen,
  onClose,
  onSelectForQA,
}) => {
  // --- ESC closes the sheet (listener lives above the render guard) ---
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clear a pending [Copied ✓] timer if the drawer unmounts mid-feedback.
  useEffect(() => {
    return () => {
      if (memoResetTimer.current) clearTimeout(memoResetTimer.current);
    };
  }, []);

  // --- Share rail state (inlined from the deleted ShareThisAlpha component) ---
  // Hooks must run unconditionally — values degrade to empty strings when no
  // opportunity is loaded, so the share rail renders nothing actionable then.
  const [copied, setCopied] = useState(false);

  // One-Click Export: [Copy Memo] → clipboard async memo dossier in the top bar.
  const [memoCopied, setMemoCopied] = useState(false);
  const memoResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareText = opportunity
    ? opportunity.short_description
      ? `${opportunity.title} — ${opportunity.short_description}`
      : opportunity.title
    : '';
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText, url: pageUrl });
        return;
      } catch {
        // User dismissed the share sheet — no-op, fall through to nothing.
      }
    }
    // No Web Share API: open the X intent as the default fallback.
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }, [shareText, pageUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions / non-secure context) — stay silent.
    }
  }, [pageUrl]);

  // --- One-Click Export: structured Executive Markdown Dossier ---
  const handleCopyDossier = useCallback(async () => {
    if (!opportunity) return;
    const dossier = [
      `# Opportunity Dossier: ${opportunity.title}`,
      `**Sector**: ${opportunity.sector || opportunity.dominant_sector || 'General'} | **Region**: ${opportunity.region || opportunity.primary_region || 'Global'}`,
      `**Viability Score**: ${opportunity.feasibility_score}% | **Band**: ${opportunity.band}`,
      '',
      '## Core Problem',
      opportunity.core_problem || opportunity.short_description || '',
      '',
      '## Actionable Venture Model',
      opportunity.actionable_venture_model || opportunity.long_description || '',
      '',
      '## Concrete Catalysts',
      ...(opportunity.specific_catalysts || []).map((c) => `- ${c}`),
      '',
      '## Key Execution Risks & Invalidation Criteria',
      ...(opportunity.risks || []).map((r) => `- ${r}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(dossier);
      setMemoCopied(true);
      if (memoResetTimer.current) clearTimeout(memoResetTimer.current);
      memoResetTimer.current = setTimeout(() => setMemoCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions / non-secure context) — stay silent.
    }
  }, [opportunity]);
  // --- end one-click export ---

  const openX = () =>
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer'
    );

  const openLinkedIn = () =>
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );

  const shareButtonBase =
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]';
  // --- end share rail state ---

  const bandMeta = opportunity ? getBandMetadata(opportunity.band) : null;

  return (
    <AnimatePresence>
      {isOpen && opportunity && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Sheet — anchored right, full height, no dependency on parent layout */}
          <motion.aside
            key="drawer-sheet"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="relative z-10 w-full max-w-xl h-full bg-neutral-950 border-l border-neutral-800 p-6 overflow-y-auto shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Signal dossier: ${opportunity.title}`}
          >
            {/* Top bar — dossier id + ESC affordance */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 shrink-0">
              <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
                Signal Dossier #{opportunity.id}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyDossier}
                  className="text-neutral-400 hover:text-white text-xs font-mono px-2 py-1 rounded border border-neutral-800 hover:border-neutral-600 transition-colors"
                  aria-label="Copy executive memo to clipboard"
                  title="Copy executive memorandum"
                >
                  {memoCopied ? 'Copied ✓' : 'Copy Memo'}
                </button>
                <button
                  onClick={onClose}
                  className="text-neutral-400 hover:text-white text-sm px-2 py-1 rounded border border-neutral-800 hover:border-neutral-600 transition-colors"
                  aria-label="Close dossier (Escape)"
                >
                  ✕ Esc
                </button>
              </div>
            </div>

            {/* Scrollable dossier body */}
            <div className="space-y-5 text-xs font-medium pt-5">
              {/* Dossier pills + title */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                  <span className="px-2.5 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 flex items-center">
                    <Sparkles className="w-3 h-3 mr-1 text-amber-300" />
                    {opportunity.type.toUpperCase()}
                  </span>
                  {opportunity.dominant_sector && (
                    <span className="px-2.5 py-0.5 rounded-md font-bold bg-white/5 text-slate-300 border border-white/10">
                      {opportunity.dominant_sector.toUpperCase()}
                    </span>
                  )}
                  {opportunity.primary_region && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-bold bg-white/5 text-slate-300 border border-white/10">
                      <Globe className="w-3 h-3 mr-1 text-emerald-400" />
                      {opportunity.primary_region}
                    </span>
                  )}
                  {bandMeta && (
                    <span className={`px-2.5 py-0.5 rounded-md font-bold border ${
                      opportunity.band === 'green'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                        : opportunity.band === 'orange'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/40'
                    }`}>
                      {opportunity.probability_score}% • {bandMeta.label}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-black text-white leading-snug tracking-tight">
                  {opportunity.title}
                </h2>
              </div>

              {/* The Alpha (TL;DR) — why should I care, instantly (inlined) */}
              {opportunity.short_description && (
                <section
                  aria-label="The Alpha — executive summary"
                  className="green-border-animated relative rounded-2xl bg-emerald-500/[0.06] backdrop-blur-md p-4 overflow-hidden"
                >
                  {/* Ambient emerald glow bleeding from the top edge */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                        <Zap className="w-3.5 h-3.5 text-emerald-300" />
                      </span>
                      <h3 className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">
                        The Alpha (TL;DR)
                      </h3>
                    </div>
                    <p className="emerald-gradient-text text-sm sm:text-base font-bold leading-relaxed tracking-tight">
                      {opportunity.short_description}
                    </p>
                  </div>
                </section>
              )}

              {/* Problem Statement & Technical Teardown */}
              {opportunity.detailed_problem_breakdown && (
                <div className="bg-amber-500/[0.06] rounded-2xl p-4 ring-1 ring-amber-500/25 backdrop-blur-md">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 mb-2 flex items-center font-mono">
                    <Target className="w-4 h-4 mr-1.5 text-amber-400" /> Problem Statement & Market Bottleneck Teardown
                  </h4>
                  <div className="text-xs text-slate-300 leading-relaxed font-medium space-y-2 whitespace-pre-line">
                    {opportunity.detailed_problem_breakdown}
                  </div>
                </div>
              )}

              {/* Dedicated Callout: Field Blueprint / Real-World Parallel */}
              {opportunity.case_example && (
                <div className="bg-gradient-to-br from-emerald-950/80 to-teal-950/80 text-white rounded-2xl p-4 ring-1 ring-emerald-500/40 shadow-[0_0_30px_-10px_rgba(16,185,129,0.4)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                    <Building2 className="w-16 h-16 text-emerald-300" />
                  </div>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 mb-2 flex items-center font-mono">
                    <Building2 className="w-4 h-4 mr-1.5 text-emerald-400" /> Field Blueprint / Real-World Parallel
                  </h4>
                  <p className="text-xs text-emerald-50 leading-relaxed font-medium relative z-10">{opportunity.case_example}</p>
                </div>
              )}

              {/* Venture Execution & Monetization Blueprint */}
              {opportunity.actionable_venture_model && (
                <div className="bg-emerald-500/[0.06] rounded-2xl p-4 ring-1 ring-emerald-500/25 backdrop-blur-md">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 mb-2 flex items-center font-mono">
                    <Lightbulb className="w-4 h-4 mr-1.5 text-emerald-400" /> Venture Execution & Commercial Blueprint
                  </h4>
                  <div className="text-xs text-slate-300 leading-relaxed font-medium space-y-2 whitespace-pre-line">
                    {opportunity.actionable_venture_model}
                  </div>
                </div>
              )}

              {/* Concrete Macro Catalysts */}
              {opportunity.specific_catalysts && opportunity.specific_catalysts.length > 0 && (
                <div className="bg-white/5 rounded-2xl p-4 ring-1 ring-white/10 backdrop-blur-md">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 mb-2 flex items-center font-mono">
                    <Flame className="w-4 h-4 mr-1.5 text-amber-400" /> Concrete Macro & Technical Catalysts
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
                    {opportunity.specific_catalysts.map((cat, idx) => (
                      <li key={idx} className="flex items-start bg-white/[0.03] p-2.5 rounded-xl ring-1 ring-white/5">
                        <span className="text-amber-400 font-bold mr-2">⚡</span>
                        <span className="leading-snug">{cat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Score Breakdown */}
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 font-mono">Viability Scores</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-500/10 p-3 rounded-xl ring-1 ring-emerald-500/30">
                    <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">Feasibility</span>
                    <span className="text-base font-black text-emerald-300 font-mono">{opportunity.feasibility_score}%</span>
                  </div>
                  <div className="bg-emerald-500/10 p-3 rounded-xl ring-1 ring-emerald-500/30">
                    <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">Impact</span>
                    <span className="text-base font-black text-emerald-300 font-mono">{opportunity.impact_score}%</span>
                  </div>
                  <div className="bg-amber-500/10 p-3 rounded-xl ring-1 ring-amber-500/30">
                    <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">Time-to-Market</span>
                    <span className="text-base font-black text-amber-300 font-mono">{opportunity.time_to_market_score}%</span>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis */}
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">Detailed Opportunity Drivers</h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-white/5 p-4 rounded-2xl ring-1 ring-white/10 backdrop-blur-md font-medium">
                  {opportunity.long_description}
                </p>
              </div>

              {/* Risks & Assumptions Grid */}
              <div className="space-y-3">
                <div className="bg-rose-500/[0.08] ring-1 ring-rose-500/30 p-3.5 rounded-2xl backdrop-blur-md">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-rose-300 mb-2 flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-400" /> Key Execution Risks
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 font-medium">
                    {(opportunity.risks || []).map((risk, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-rose-400 mr-1.5 font-bold">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                    {(!opportunity.risks || opportunity.risks.length === 0) && (
                      <li className="text-slate-500 italic">No specific risk flags identified.</li>
                    )}
                  </ul>
                </div>

                <div className="bg-emerald-500/[0.08] ring-1 ring-emerald-500/30 p-3.5 rounded-2xl backdrop-blur-md">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 mb-2 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Underlying Assumptions
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 font-medium">
                    {(opportunity.assumptions || []).map((assump, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-emerald-400 mr-1.5 font-bold">✓</span>
                        <span>{assump}</span>
                      </li>
                    ))}
                    {(!opportunity.assumptions || opportunity.assumptions.length === 0) && (
                      <li className="text-slate-500 italic">No explicit assumption dependencies.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Linked Source Articles */}
              {opportunity.source_articles && opportunity.source_articles.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center font-mono">
                    <Layers className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Linked News Source Signals ({opportunity.source_articles.length})
                  </h4>
                  <div className="space-y-1.5">
                    {opportunity.source_articles.map((art, idx) => (
                      <a
                        key={idx}
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-emerald-500/50 hover:bg-white/10 transition-all duration-300 text-xs text-slate-100 group backdrop-blur-md"
                      >
                        <span className="truncate max-w-xs font-bold text-slate-200 group-hover:text-emerald-300">
                          {art.title}
                        </span>
                        <span className="inline-flex items-center text-slate-500 group-hover:text-emerald-400 shrink-0 ml-2">
                          <span className="mr-1.5 text-[9px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-slate-400 ring-1 ring-white/10 font-bold">
                            {art.country_code}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Share this Alpha — viral distribution rail (inlined) */}
              <section
                aria-label="Share this opportunity"
                className="rounded-2xl bg-white/5 backdrop-blur-md ring-1 ring-white/10 p-3.5 flex items-center justify-between gap-3 flex-wrap"
              >
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center">
                  <Share2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Share this Alpha
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className={`${shareButtonBase} bg-emerald-500/15 ring-1 ring-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 shadow-[0_0_16px_-4px_rgba(16,185,129,0.4)]`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={openX}
                    aria-label="Share on X"
                    title="Share on X"
                    className={`${shareButtonBase} bg-white/5 ring-1 ring-white/15 text-slate-200 hover:bg-white/10 hover:text-white`}
                  >
                    {X_ICON}
                    X
                  </button>
                  <button
                    type="button"
                    onClick={openLinkedIn}
                    aria-label="Share on LinkedIn"
                    title="Share on LinkedIn"
                    className={`${shareButtonBase} bg-white/5 ring-1 ring-white/15 text-slate-200 hover:bg-white/10 hover:text-white`}
                  >
                    {LINKEDIN_ICON}
                    LinkedIn
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    aria-label="Copy link to this opportunity"
                    title="Copy link"
                    className={`${shareButtonBase} bg-white/5 ring-1 ring-white/15 text-slate-200 hover:bg-white/10 hover:text-white`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Link2 className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </section>
            </div>

            {/* Footer Action Bar */}
            <div className="pt-4 mt-5 border-t border-neutral-800 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-neutral-400 font-bold">
                Bind context into Radar Scout AI
              </span>
              <button
                onClick={() => {
                  onSelectForQA(opportunity);
                }}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-[0_0_20px_-4px_rgba(16,185,129,0.5)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
              >
                <Bot className="w-4 h-4 mr-1.5" />
                Ask Scout AI
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
