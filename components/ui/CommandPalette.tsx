'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Command } from 'cmdk';
import { DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { ArrowUpRight, Bot, Globe, LoaderCircle, Search, X } from 'lucide-react';
import { FOCUS_MARKETS } from '@/src/config/focusMarkets';

export interface OpportunityItem {
  id: number;
  title: string;
  short_description?: string;
  sector?: string;
  region?: string;
  feasibility_score?: number;
}

/** One result row, normalized across server (semantic) and client (fuzzy) legs. */
interface PaletteResult extends OpportunityItem {
  /** 'hybrid' — server RRF hit; 'fuzzy' — client-side fallback match. */
  source: 'hybrid' | 'fuzzy';
  /** RRF fusion score (1/(60+vector_rank) + 1/(60+text_rank)), server results only. */
  rrfScore?: number;
  /** Cosine similarity from the vector leg (0 when matched via FTS only). */
  vectorSimilarity?: number;
}

/** Server-side hybrid search kicks in at this query length. */
const SERVER_SEARCH_MIN_LENGTH = 2;
/** Debounce: keystrokes coalesce before the /api/search round-trip. */
const SEARCH_DEBOUNCE_MS = 250;

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOpportunity: (opp: OpportunityItem) => void;
  opportunities?: OpportunityItem[];
  onFilterRegion: (region: string) => void;
  onAskAI: (question: string) => void;
}

/** Client-side fuzzy filter — the offline / server-failure fallback. */
function fuzzyFilter(opportunities: OpportunityItem[], query: string): PaletteResult[] {
  const q = query.trim().toLowerCase();
  return opportunities
    .filter((opp) => {
      const title = (opp.title || '').toLowerCase();
      const sector = (opp.sector || '').toLowerCase();
      const region = (opp.region || '').toLowerCase();
      const desc = (opp.short_description || '').toLowerCase();
      return (
        title.includes(q) ||
        sector.includes(q) ||
        region.includes(q) ||
        desc.includes(q)
      );
    })
    .map((opp) => ({ ...opp, source: 'fuzzy' as const }))
    .slice(0, 8);
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectOpportunity,
  opportunities = [],
  onFilterRegion,
  onAskAI,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [serverResults, setServerResults] = useState<PaletteResult[]>([]);
  const [isServerLoading, setIsServerLoading] = useState(false);
  const [serverFailed, setServerFailed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setServerResults([]);
      setServerFailed(false);
    }
  }, [isOpen]);

  // Clean up in-flight requests and timers on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const runServerSearch = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsServerLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (controller.signal.aborted) return;
        if (json.success && Array.isArray(json.results)) {
          setServerResults(
            json.results.map(
              (r: {
                id: number;
                title: string;
                short_description: string | null;
                dominant_sector: string | null;
                primary_region: string | null;
                feasibility_score?: number;
                probability_score?: number;
                rrf_score?: number;
                vector_similarity?: number;
              }) => ({
                id: r.id,
                title: r.title,
                short_description: r.short_description || undefined,
                sector: r.dominant_sector || undefined,
                region: r.primary_region || undefined,
                feasibility_score: r.feasibility_score,
                source: 'hybrid' as const,
                rrfScore: r.rrf_score,
                vectorSimilarity: r.vector_similarity,
              })
            )
          );
          setServerFailed(false);
        } else {
          setServerResults([]);
          setServerFailed(true);
        }
      } catch (err) {
        // AbortController aborts are expected (superseded by a newer query).
        if ((err as Error).name !== 'AbortError') {
          setServerResults([]);
          setServerFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsServerLoading(false);
        }
      }
    },
    []
  );

  // Query → hybrid server search (debounced), falling back to client fuzzy
  // filtering while loading, on failure, offline, or for 1-char queries.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    setServerResults([]);
    setIsServerLoading(false);
    setServerFailed(false);

    const trimmed = query.trim();
    if (!isOpen || trimmed.length < SERVER_SEARCH_MIN_LENGTH) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      runServerSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [query, isOpen, runServerSearch]);

  const filtered = useMemo<PaletteResult[]>(() => {
    if (!query.trim()) {
      return opportunities
        .slice(0, 8)
        .map((opp) => ({ ...opp, source: 'fuzzy' as const }));
    }
    const local = fuzzyFilter(opportunities, query);
    const localIds = new Set(local.map((item) => item.id));
    const additional = !serverFailed && !isServerLoading
      ? serverResults.filter((item) => !localIds.has(item.id)) : [];
    return [...local, ...additional].slice(0, 8);
  }, [serverFailed, isServerLoading, serverResults, opportunities, query]);

  const regions = useMemo(() => {
    const known = Object.values(FOCUS_MARKETS)
      .filter((market) => market.id !== 'ROW')
      .map((market) => ({ value: market.id as string, label: market.displayName }));
    const additional = [...new Set(opportunities.map((opp) => opp.region?.toUpperCase()).filter((region): region is string => Boolean(region)))];
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    return [{ value: 'all', label: 'All regions' }, ...known, ...additional
      .filter((region) => !known.some((market) => market.value === region))
      .map((region) => ({ value: region, label: /^[A-Z]{2}$/.test(region) ? names.of(region) || region : region }))]
      .filter((region) => `filter region ${region.label} ${region.value}`.toLowerCase().includes(query.trim().toLowerCase()));
  }, [opportunities, query]);

  const select = (action: () => void) => { action(); onClose(); };
  const itemClass = 'flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm text-slate-300 transition-colors data-[selected=true]:border-emerald-500/20 data-[selected=true]:bg-emerald-500/10 data-[selected=true]:text-slate-200';

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      label="Opportunity Earth command palette"
      shouldFilter={false}
      loop
      overlayClassName="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[8vh] sm:top-[12vh] z-[71] w-[calc(100%_-_2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 text-slate-200 shadow-[0_24px_100px_rgba(0,0,0,0.7)] backdrop-blur-md"
    >
        <DialogTitle className="sr-only">Opportunity Earth command palette</DialogTitle>
        <DialogDescription className="sr-only">Search opportunities, filter by region, or send a question to the AI assistant. Use arrow keys to navigate and Enter to select.</DialogDescription>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800">
          <Search className="h-5 w-5 shrink-0 text-emerald-400" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search opportunities, filter a region, or ask AI…"
            className="min-w-0 w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
            autoFocus
          />
          {isServerLoading && <LoaderCircle aria-label="Searching" className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
          <button type="button" onClick={onClose} aria-label="Close command palette" className="rounded p-1 text-slate-500 hover:text-slate-200"><X className="h-4 w-4" /></button>
        </div>

        <Command.List className="max-h-[55vh] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-slate-500">
          <Command.Empty className="p-6 text-center text-xs text-slate-500">No matching opportunities or regions.</Command.Empty>
          {filtered.length > 0 && <Command.Group heading="Opportunities">
            {filtered.map((opp) => (
              <Command.Item
                key={opp.id}
                value={`opportunity-${opp.id}`}
                onSelect={() => select(() => onSelectOpportunity(opp))}
                className={itemClass}
              >
                <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{opp.title}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase text-slate-500">{opp.sector || 'General'} · {opp.region || 'Global'}</p>
                </div>
                {opp.feasibility_score !== undefined && (
                  <span className="font-mono text-xs text-emerald-400 shrink-0 tabular-nums">
                    {opp.feasibility_score}%
                  </span>
                )}
              </Command.Item>
            ))}
          </Command.Group>}
          {regions.length > 0 && <Command.Group heading="Filter by region">
            {regions.map((region) => (
              <Command.Item key={region.value} value={`region-${region.value}`} onSelect={() => select(() => onFilterRegion(region.value))} className={itemClass}>
                <Globe className="h-4 w-4 text-slate-500" />
                <span className="flex-1">{region.label}</span>
                <span className="font-mono text-[10px] text-slate-500">FILTER</span>
              </Command.Item>
            ))}
          </Command.Group>}
          {query.trim() && <Command.Group heading="AI assistant">
            <Command.Item value="ask-ai" onSelect={() => select(() => onAskAI(query.trim()))} className={itemClass}>
              <Bot className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="min-w-0 flex-1 truncate">Ask AI: {query.trim()}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" />
            </Command.Item>
          </Command.Group>}
        </Command.List>

        {/* Provenance footer — which search leg produced these rows */}
        <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between font-mono text-[10px] text-slate-500">
          <span>OPPORTUNITY EARTH</span>
          <span>↑↓ Navigate · ↵ Select · Esc Close</span>
        </div>
    </Command.Dialog>
  );
}
