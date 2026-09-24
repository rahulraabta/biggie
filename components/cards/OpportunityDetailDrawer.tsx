'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  TrendingUp,
  AlertOctagon,
  Brain,
  ChevronDown,
} from 'lucide-react';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { getBandMetadata } from '@/src/utils/geoUtils';

interface SynergyOpportunity {
  id: number;
  title: string;
  type?: string;
  band?: string;
  short_description?: string | null;
  dominant_sector?: string | null;
  primary_region?: string | null;
  vector_similarity?: number;
  probability_score?: number;
  sector?: string;
  region?: string;
}

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

// --- P4: Viability score matrix weights (deconstruction of the composite) ---
const SCORE_WEIGHTS = {
  feasibility: 0.35,
  marketImpact: 0.25,
  timingVelocity: 0.2,
  executionRisk: 0.2,
} as const;

// --- What-If Macro Stress Test Scenarios ---
export type MacroScenario = 'regulatory_crackdown' | 'supply_chain_shock' | 'interest_rate_cut';

export interface ScenarioDefinition {
  id: MacroScenario;
  label: string;
  description: string;
  modifiers: {
    feasibility?: number;     // e.g. -15
    marketImpact?: number;    // e.g. +10
    timingVelocity?: number;  // e.g. -25
    executionRisk?: number;   // e.g. +20
  };
}

export const MACRO_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'regulatory_crackdown',
    label: 'Regulatory Crackdown',
    description: 'Tighter compliance and licensing bottlenecks drop execution velocity by 25%.',
    modifiers: {
      timingVelocity: -25,
    },
  },
  {
    id: 'supply_chain_shock',
    label: 'Supply Chain Shock',
    description: 'Component shortages and logistic bottlenecks reduce feasibility by 15% and raise execution risk by 20%.',
    modifiers: {
      feasibility: -15,
      executionRisk: 20,
    },
  },
  {
    id: 'interest_rate_cut',
    label: 'Interest Rate Cut',
    description: 'Cheaper cost of capital unlocks venture spending, boosting market impact by 10%.',
    modifiers: {
      marketImpact: 10,
    },
  },
];

/** Kill-criteria taxonomy: keyword heuristics map each flagged risk to the
 *  failure mode that would invalidate the thesis. Domain vocabulary is
 *  centralized here so tuning the classification is a one-place edit. */
interface KillCategory {
  label: string;
  accent: 'red' | 'amber';
  pattern: RegExp;
}
const KILL_CATEGORIES: KillCategory[] = [
  { label: 'REGULATORY SHIFT', accent: 'amber', pattern: /regulat|polic|government|sanction|licen[cs]|complian|legal|tariff|geopolit/i },
  { label: 'MACRO DETERIORATION', accent: 'red', pattern: /price|cost|margin|macro|inflation|demand|recession|volatil|currency|interest/i },
  { label: 'COUNTERPARTY FAILURE', accent: 'red', pattern: /default|counterparty|off-?taker|supplier|partner|bankrupt|creditor/i },
  { label: 'EXECUTION SLIP', accent: 'amber', pattern: /talent|team|hiring|execution|operational|infrastruct|scal|capacity|technolog/i },
];

const classifyKillCriterion = (risk: string): KillCategory =>
  KILL_CATEGORIES.find((c) => c.pattern.test(risk)) ?? {
    label: 'THESIS EROSION',
    accent: 'amber',
    pattern: /.*/,
  };

/** Signal velocity tiers for the 48h momentum trigger. */
type VelocityTier = 'surge' | 'momentum' | 'steady';
interface SignalVelocity {
  tier: VelocityTier;
  /** (source_count − 1) × 100 — cluster growth over its single initiating signal. */
  surgePercent: number;
  /** Cluster age in hours (display-capped at 48). */
  windowHours: number;
  /** Signals inside a 48h window (raw count while the cluster is younger than 48h). */
  windowedCount: number;
  sourceCount: number;
}

const computeSignalVelocity = (opp: OpportunityResponseItem): SignalVelocity | null => {
  if (!opp.created_at || typeof opp.source_count !== 'number' || opp.source_count < 1) return null;
  const createdMs = Date.parse(opp.created_at);
  if (Number.isNaN(createdMs)) return null;
  const ageHours = Math.max(1, (Date.now() - createdMs) / 3_600_000);
  // Older clusters are density-normalized to a 48h window: sources × (48 / age).
  const windowedCount =
    ageHours <= 48 ? opp.source_count : Math.max(1, Math.round(opp.source_count * (48 / ageHours)));
  const tier: VelocityTier =
    ageHours <= 48 && opp.source_count >= 3 ? 'surge' : windowedCount >= 3 ? 'momentum' : 'steady';
  return {
    tier,
    surgePercent: Math.max(0, (opp.source_count - 1) * 100),
    windowHours: Math.min(48, Math.round(ageHours)),
    windowedCount,
    sourceCount: opp.source_count,
  };
};

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

  // Clear a pending [Copied ✓] timer or ongoing stream if the drawer unmounts mid-feedback.
  useEffect(() => {
    return () => {
      if (blindspotAbortRef.current) blindspotAbortRef.current.abort();
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

  // --- Strategic Synergies & Adjacencies (Vector Semantic Retrieval) ---
  const [synergies, setSynergies] = useState<SynergyOpportunity[]>([]);
  const [synergiesLoading, setSynergiesLoading] = useState(false);

  // --- Macro Scenario Stress-Test State ---
  const [activeScenario, setActiveScenario] = useState<MacroScenario | null>(null);

  // --- Dynamic AI Blindspot Synthesis State ---
  const [isBlindspotExpanded, setIsBlindspotExpanded] = useState(false);
  const [blindspotStatus, setBlindspotStatus] = useState<'idle' | 'loading' | 'complete'>('idle');
  const [blindspotText, setBlindspotText] = useState<string>('');
  const blindspotAbortRef = useRef<AbortController | null>(null);

  // Reset blindspot synthesis when the active opportunity changes
  useEffect(() => {
    if (blindspotAbortRef.current) {
      blindspotAbortRef.current.abort();
      blindspotAbortRef.current = null;
    }
    setIsBlindspotExpanded(false);
    setBlindspotStatus('idle');
    setBlindspotText('');
  }, [opportunity?.id]);

  const triggerBlindspotSynthesis = useCallback(async () => {
    if (blindspotStatus !== 'idle') return;
    setBlindspotStatus('loading');
    setBlindspotText('');

    if (blindspotAbortRef.current) {
      blindspotAbortRef.current.abort();
    }
    const controller = new AbortController();
    blindspotAbortRef.current = controller;

    try {
      const res = await fetch('/api/blindspot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityId: opportunity?.id,
          title: opportunity?.title,
          sector: opportunity?.dominant_sector || (opportunity as any)?.sector,
          region: opportunity?.primary_region || (opportunity as any)?.region,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Streaming failed with status: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setBlindspotText(accumulated);
        }
      }

      setBlindspotStatus('complete');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('[OpportunityDetailDrawer] Blindspot streaming error:', err);
      // Graceful termination so UI does not remain hung in loading state
      setBlindspotStatus('complete');
    }
  }, [blindspotStatus, opportunity]);

  const handleToggleBlindspot = useCallback(() => {
    setIsBlindspotExpanded((prev) => {
      const next = !prev;
      if (next && blindspotStatus === 'idle') {
        triggerBlindspotSynthesis();
      }
      return next;
    });
  }, [blindspotStatus, triggerBlindspotSynthesis]);

  useEffect(() => {
    if (!isOpen || !opportunity) {
      setSynergies([]);
      setSynergiesLoading(false);
      return;
    }

    const query = opportunity.title || opportunity.dominant_sector || (opportunity as any).sector || '';
    if (!query.trim()) {
      setSynergies([]);
      setSynergiesLoading(false);
      return;
    }

    const controller = new AbortController();
    setSynergiesLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(query)}&limit=3`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Search request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.results)) {
          // Filter out the active opportunity to present truly adjacent signals
          const filtered = data.results
            .filter((item: SynergyOpportunity) => item.id !== opportunity.id)
            .slice(0, 3);
          setSynergies(filtered);
        } else {
          setSynergies([]);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[OpportunityDetailDrawer] Synergies search error:', err);
          setSynergies([]);
        }
      })
      .finally(() => {
        setSynergiesLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [isOpen, opportunity?.id, opportunity?.title, opportunity?.dominant_sector]);

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

  // --- P4: weighted viability score matrix ---
  // Execution risk is not stored on the row — derived as the residual that
  // reconciles the three stored components with the composite probability
  // score, clamped to 0-100. When clamping bites, the weighted sum drifts
  // from the composite and the matrix footnotes it rather than hiding it.
  const scoreMatrix = useMemo(() => {
    if (!opportunity) return null;
    const weightedKnown =
      opportunity.feasibility_score * SCORE_WEIGHTS.feasibility +
      opportunity.impact_score * SCORE_WEIGHTS.marketImpact +
      opportunity.time_to_market_score * SCORE_WEIGHTS.timingVelocity;
    const residual = Math.round(
      (opportunity.probability_score - weightedKnown) / SCORE_WEIGHTS.executionRisk
    );
    const executionRisk = Math.min(100, Math.max(0, residual));
    return {
      executionRisk,
      clamped: residual !== executionRisk,
      composite: opportunity.probability_score,
      rows: [
        { label: 'FEASIBILITY', weight: SCORE_WEIGHTS.feasibility, raw: opportunity.feasibility_score, derived: false },
        { label: 'MARKET IMPACT', weight: SCORE_WEIGHTS.marketImpact, raw: opportunity.impact_score, derived: false },
        { label: 'TIMING & VELOCITY', weight: SCORE_WEIGHTS.timingVelocity, raw: opportunity.time_to_market_score, derived: false },
        { label: 'EXECUTION RISK', weight: SCORE_WEIGHTS.executionRisk, raw: executionRisk, derived: true },
      ].map((r) => ({ ...r, contribution: r.raw * r.weight })),
    };
  }, [opportunity]);

  // --- Macro Scenario What-If Stress Calculations ---
  const adjustedScores = useMemo(() => {
    if (!opportunity || !scoreMatrix) return null;

    const baseFeasibility = opportunity.feasibility_score;
    const baseMarketImpact = opportunity.impact_score;
    const baseVelocity = opportunity.time_to_market_score;
    const baseExecutionRisk = scoreMatrix.executionRisk;

    if (!activeScenario) {
      return {
        feasibility: { value: baseFeasibility, delta: 0, status: 'neutral' as const },
        marketImpact: { value: baseMarketImpact, delta: 0, status: 'neutral' as const },
        timingVelocity: { value: baseVelocity, delta: 0, status: 'neutral' as const },
        executionRisk: { value: baseExecutionRisk, delta: 0, status: 'neutral' as const },
      };
    }

    const scenario = MACRO_SCENARIOS.find((s) => s.id === activeScenario);
    const modFeas = scenario?.modifiers.feasibility ?? 0;
    const modImpact = scenario?.modifiers.marketImpact ?? 0;
    const modVelocity = scenario?.modifiers.timingVelocity ?? 0;
    const modRisk = scenario?.modifiers.executionRisk ?? 0;

    const adjustedFeas = Math.min(100, Math.max(0, baseFeasibility + modFeas));
    const adjustedImpact = Math.min(100, Math.max(0, baseMarketImpact + modImpact));
    const adjustedVelocity = Math.min(100, Math.max(0, baseVelocity + modVelocity));
    const adjustedRisk = Math.min(100, Math.max(0, baseExecutionRisk + modRisk));

    const deltaFeas = adjustedFeas - baseFeasibility;
    const deltaImpact = adjustedImpact - baseMarketImpact;
    const deltaVelocity = adjustedVelocity - baseVelocity;
    const deltaRisk = adjustedRisk - baseExecutionRisk;

    return {
      feasibility: {
        value: adjustedFeas,
        delta: deltaFeas,
        status: deltaFeas > 0 ? ('improved' as const) : deltaFeas < 0 ? ('worsened' as const) : ('neutral' as const),
      },
      marketImpact: {
        value: adjustedImpact,
        delta: deltaImpact,
        status: deltaImpact > 0 ? ('improved' as const) : deltaImpact < 0 ? ('worsened' as const) : ('neutral' as const),
      },
      timingVelocity: {
        value: adjustedVelocity,
        delta: deltaVelocity,
        status: deltaVelocity > 0 ? ('improved' as const) : deltaVelocity < 0 ? ('worsened' as const) : ('neutral' as const),
      },
      executionRisk: {
        value: adjustedRisk,
        delta: deltaRisk,
        // For risk: higher is worse, lower is better
        status: deltaRisk > 0 ? ('worsened' as const) : deltaRisk < 0 ? ('improved' as const) : ('neutral' as const),
      },
    };
  }, [opportunity, scoreMatrix, activeScenario]);

  // --- Thesis invalidation triggers (2-3 specific triggers with failure mode and accent) ---
  const killTriggers = useMemo(() => {
    if (!opportunity) return [];
    const items: Array<{ label: string; description: string; accent: 'red' | 'amber' }> = [];

    if (opportunity.risks && opportunity.risks.length > 0) {
      opportunity.risks.slice(0, 3).forEach((risk) => {
        const cat = classifyKillCriterion(risk);
        items.push({
          label: cat.label,
          description: risk,
          accent: cat.accent,
        });
      });
    }

    const fallbacks: Array<{ label: string; description: string; accent: 'red' | 'amber' }> = [
      {
        label: 'REGULATORY REVERSAL',
        description: 'Abrupt shift in jurisdictional policy, licensing restrictions, or withdrawal of trade incentives.',
        accent: 'amber',
      },
      {
        label: 'SUPPLY CHAIN SUBSTITUTE',
        description: 'Rapid market commoditization by incumbent suppliers or unviable tier-1 dependency bottlenecks.',
        accent: 'red',
      },
      {
        label: 'MACRO HURDLE DISLOCATION',
        description: 'Cost of capital shift or severe margin compression exceeding underwriting thresholds.',
        accent: 'red',
      },
    ];

    let fallbackIdx = 0;
    while (items.length < 2 && fallbackIdx < fallbacks.length) {
      items.push(fallbacks[fallbackIdx++]);
    }

    return items.slice(0, 3);
  }, [opportunity]);

  // --- One-Click Export: structured Executive Markdown Dossier ---
  const handleCopyDossier = useCallback(async () => {
    if (!opportunity) return;
    const executionRiskVal = scoreMatrix ? scoreMatrix.executionRisk : 0;
    const dossier = [
      `# Opportunity Dossier: ${opportunity.title}`,
      `**Sector**: ${opportunity.sector || opportunity.dominant_sector || 'General'} | **Region**: ${opportunity.region || opportunity.primary_region || 'Global'}`,
      `**Viability Score**: ${opportunity.feasibility_score}% | **Band**: ${opportunity.band}`,
      `**Score Matrix**: Feasibility (35%): ${opportunity.feasibility_score}% | Market Impact (25%): ${opportunity.impact_score}% | Velocity & Timing (20%): ${opportunity.time_to_market_score}% | Execution Risk (20%): ${executionRiskVal}%`,
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
      '## Thesis Invalidation / Kill Criteria',
      ...killTriggers.map((t) => `- [${t.label}] ${t.description}`),
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
  }, [opportunity, scoreMatrix, killTriggers]);
  // --- end one-click export ---

  // --- P4: 48h signal momentum trigger ---
  const velocity = useMemo(
    () => (opportunity ? computeSignalVelocity(opportunity) : null),
    [opportunity]
  );

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
                      {bandMeta.label.toUpperCase()}
                    </span>
                  )}
                  {/* P4: Signal Velocity Trigger — 48h momentum badge */}
                  {velocity && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold border ${
                        velocity.tier === 'surge'
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.45)]'
                          : velocity.tier === 'momentum'
                          ? 'bg-amber-500/15 text-amber-200 border-amber-500/50'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                      title="Signal momentum derived from cluster source volume over its formation window"
                    >
                      {velocity.tier === 'surge' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      )}
                      <TrendingUp className="w-3 h-3" />
                      {velocity.tier === 'surge'
                        ? `+${velocity.surgePercent}% surge in last ${velocity.windowHours}h`
                        : velocity.tier === 'momentum'
                        ? `High Density Momentum · ~${velocity.windowedCount}/48h`
                        : `~${velocity.windowedCount} signals/48h`}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-black text-white leading-snug tracking-tight">
                  {opportunity.title}
                </h2>

                {/* Score Breakdown Matrix: high-density 4-metric matrix in a 2x2 monospace grid */}
                {scoreMatrix && adjustedScores && (
                  <div className="space-y-2">
                    {/* MACRO STRESS TEST Toggle Row */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider mr-1">
                        Macro Stress Test:
                      </span>
                      {MACRO_SCENARIOS.map((scenario) => {
                        const isActive = activeScenario === scenario.id;
                        return (
                          <button
                            key={scenario.id}
                            type="button"
                            onClick={() => setActiveScenario(isActive ? null : scenario.id)}
                            className={`text-xs rounded-full border px-3 py-1 transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                            }`}
                            title={scenario.description}
                          >
                            {scenario.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="bg-neutral-900/50 border border-neutral-800 rounded p-3 text-xs font-mono">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {/* Feasibility */}
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Feasibility (35%)</span>
                          <div className="flex items-center gap-1 font-bold">
                            <span
                              className={
                                adjustedScores.feasibility.status === 'worsened'
                                  ? 'text-rose-400'
                                  : adjustedScores.feasibility.status === 'improved'
                                  ? 'text-emerald-400'
                                  : 'text-emerald-400'
                              }
                            >
                              {adjustedScores.feasibility.value}%
                            </span>
                            {adjustedScores.feasibility.delta !== 0 && (
                              <span
                                className={`text-[10px] ${
                                  adjustedScores.feasibility.status === 'worsened'
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                ({adjustedScores.feasibility.delta > 0 ? '+' : ''}
                                {adjustedScores.feasibility.delta}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Market Impact */}
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Market Impact (25%)</span>
                          <div className="flex items-center gap-1 font-bold">
                            <span
                              className={
                                adjustedScores.marketImpact.status === 'worsened'
                                  ? 'text-rose-400'
                                  : adjustedScores.marketImpact.status === 'improved'
                                  ? 'text-emerald-400'
                                  : 'text-emerald-400'
                              }
                            >
                              {adjustedScores.marketImpact.value}%
                            </span>
                            {adjustedScores.marketImpact.delta !== 0 && (
                              <span
                                className={`text-[10px] ${
                                  adjustedScores.marketImpact.status === 'worsened'
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                ({adjustedScores.marketImpact.delta > 0 ? '+' : ''}
                                {adjustedScores.marketImpact.delta}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Velocity & Timing */}
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Velocity & Timing (20%)</span>
                          <div className="flex items-center gap-1 font-bold">
                            <span
                              className={
                                adjustedScores.timingVelocity.status === 'worsened'
                                  ? 'text-rose-400'
                                  : adjustedScores.timingVelocity.status === 'improved'
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }
                            >
                              {adjustedScores.timingVelocity.value}%
                            </span>
                            {adjustedScores.timingVelocity.delta !== 0 && (
                              <span
                                className={`text-[10px] ${
                                  adjustedScores.timingVelocity.status === 'worsened'
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                ({adjustedScores.timingVelocity.delta > 0 ? '+' : ''}
                                {adjustedScores.timingVelocity.delta}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Execution Risk */}
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Execution Risk (20%)</span>
                          <div className="flex items-center gap-1 font-bold">
                            <span
                              className={
                                adjustedScores.executionRisk.status === 'worsened'
                                  ? 'text-rose-400'
                                  : adjustedScores.executionRisk.status === 'improved'
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }
                            >
                              {adjustedScores.executionRisk.value}%
                            </span>
                            {adjustedScores.executionRisk.delta !== 0 && (
                              <span
                                className={`text-[10px] ${
                                  adjustedScores.executionRisk.status === 'worsened'
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                ({adjustedScores.executionRisk.delta > 0 ? '+' : ''}
                                {adjustedScores.executionRisk.delta}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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

              {/* Dynamic AI Blindspot Synthesis */}
              <section aria-label="AI Blindspot Synthesis" className="space-y-0">
                <div
                  onClick={handleToggleBlindspot}
                  className="cursor-pointer bg-purple-900/10 border border-purple-500/30 p-3 rounded-md flex justify-between items-center transition-colors hover:bg-purple-900/20"
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-300 font-mono">
                      AI BLINDSPOT SYNTHESIS
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {blindspotStatus === 'loading' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse">
                        {blindspotText ? 'STREAMING...' : 'GENERATING...'}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${
                        isBlindspotExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {isBlindspotExpanded && (
                  <div className="bg-purple-900/10 border border-purple-500/30 border-t-0 p-3 pt-0 rounded-b-md">
                    {blindspotStatus === 'loading' && !blindspotText ? (
                      <div className="pt-3 border-t border-purple-500/20">
                        <div className="animate-pulse bg-purple-900/20 rounded h-4 w-full mb-2" />
                        <div className="animate-pulse bg-purple-900/20 rounded h-4 w-5/6 mb-2" />
                        <div className="animate-pulse bg-purple-900/20 rounded h-4 w-4/6 mb-2" />
                      </div>
                    ) : blindspotText ? (
                      <div className="text-xs text-purple-200/90 leading-relaxed font-mono mt-3 pt-3 border-t border-purple-500/20 whitespace-pre-line">
                        {blindspotText}
                        {blindspotStatus === 'loading' && (
                          <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-400 animate-pulse align-middle" />
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              {/* High-Visibility Thesis Invalidation / Kill Criteria */}
              <section aria-label="Thesis Invalidation — Kill Criteria" className="space-y-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center font-mono">
                  <AlertOctagon className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> THESIS INVALIDATION / KILL CRITERIA
                </h4>
                <div className="space-y-2">
                  {killTriggers.map((trigger, idx) => (
                    <div
                      key={idx}
                      className={`border-l-2 ${
                        trigger.accent === 'red' ? 'border-rose-500/80' : 'border-amber-500/80'
                      } bg-neutral-900/40 p-3 text-xs text-neutral-300 rounded-r flex flex-col gap-1`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span
                          className={`font-bold tracking-wider ${
                            trigger.accent === 'red' ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          {trigger.label}
                        </span>
                        <span className="text-neutral-600 uppercase">Trigger #{idx + 1}</span>
                      </div>
                      <p className="leading-relaxed">{trigger.description}</p>
                    </div>
                  ))}
                </div>
              </section>

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

              {/* Strategic Synergies & Adjacencies (Vector-Powered Semantic Retrieval) */}
              <section aria-label="Strategic Synergies & Adjacencies" className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center font-mono">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> STRATEGIC SYNERGIES & ADJACENCIES
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">
                    Vector Match
                  </span>
                </div>

                {synergiesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className="bg-neutral-900/40 border border-neutral-800 rounded-md p-3 animate-pulse space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="h-3.5 bg-neutral-800 rounded w-2/3" />
                          <div className="h-3 bg-neutral-800/80 rounded w-20 shrink-0" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-4 bg-neutral-800/60 rounded w-14" />
                          <div className="h-4 bg-neutral-800/60 rounded w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : synergies.length > 0 ? (
                  <div className="space-y-2">
                    {synergies.map((item) => {
                      const matchScore =
                        typeof item.vector_similarity === 'number' && item.vector_similarity > 0
                          ? `${(item.vector_similarity * 100).toFixed(1)}% Match`
                          : typeof item.probability_score === 'number'
                          ? `${item.probability_score}% Match`
                          : 'Vector Match';

                      const bandStyle =
                        item.band === 'green'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : item.band === 'orange'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                      const region = item.primary_region || item.region;
                      const sector = item.dominant_sector || item.sector;

                      return (
                        <div
                          key={item.id}
                          className="bg-neutral-900/40 border border-neutral-800 rounded-md p-3 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900/70 group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span
                              className="text-xs font-semibold text-neutral-200 truncate group-hover:text-emerald-300 transition-colors"
                              title={item.title}
                            >
                              {item.title}
                            </span>
                            <span className="font-mono text-[11px] text-emerald-400 font-bold shrink-0">
                              {matchScore}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.band && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${bandStyle}`}
                              >
                                {item.band.toUpperCase()}
                              </span>
                            )}
                            {region && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-neutral-400 border border-white/10">
                                {region}
                              </span>
                            )}
                            {sector && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400 border border-white/10">
                                {sector}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-neutral-900/40 border border-neutral-800 rounded-md p-3 text-center">
                    <p className="text-neutral-500 text-xs font-mono">
                      No strategic synergies or adjacent signals detected.
                    </p>
                  </div>
                )}
              </section>

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
