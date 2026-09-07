'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

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
}

/** Client-side fuzzy filter — the offline / server-failure fallback. */
function fuzzyFilter(opportunities: OpportunityItem[], query: string): PaletteResult[] {
  const q = query.toLowerCase();
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
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [serverResults, setServerResults] = useState<PaletteResult[]>([]);
  const [isServerLoading, setIsServerLoading] = useState(false);
  const [serverFailed, setServerFailed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
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
                feasibility_score: r.feasibility_score ?? r.probability_score,
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

    const trimmed = query.trim();
    if (!isOpen || trimmed.length < SERVER_SEARCH_MIN_LENGTH) {
      setServerResults([]);
      setServerFailed(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      runServerSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, runServerSearch]);

  // Server results take priority; the fuzzy client list stands in while the
  // request is in flight, after a failure, or when the query is too short.
  const useServer = isOpen && query.trim().length >= SERVER_SEARCH_MIN_LENGTH && !serverFailed && !isServerLoading && serverResults.length > 0;

  const filtered = useMemo<PaletteResult[]>(() => {
    if (useServer) return serverResults;
    if (!query.trim()) {
      return opportunities
        .slice(0, 8)
        .map((opp) => ({ ...opp, source: 'fuzzy' as const }));
    }
    return fuzzyFilter(opportunities, query);
  }, [useServer, serverResults, opportunities, query]);

  // Reset selection whenever the result set changes identity.
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? Math.max(0, filtered.length - 1) : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelectOpportunity(filtered[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose, onSelectOpportunity]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-neutral-800">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search signals, sectors, or regions..."
            className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none font-sans"
            autoFocus
          />
          {isServerLoading && (
            <span className="font-mono text-[10px] text-neutral-500 px-1.5 py-0.5 border border-neutral-800 rounded bg-neutral-900 animate-pulse">
              SEMANTIC…
            </span>
          )}
          <span className="font-mono text-[10px] text-neutral-500 px-1.5 py-0.5 border border-neutral-800 rounded bg-neutral-900">
            ESC
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-neutral-900">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-500 font-mono">
              No matching signals detected
            </div>
          ) : (
            filtered.map((opp, idx) => (
              <div
                key={opp.id}
                onClick={() => {
                  onSelectOpportunity(opp);
                  onClose();
                }}
                className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${
                  idx === selectedIndex
                    ? 'bg-neutral-900/80 border-l-2 border-emerald-500'
                    : 'hover:bg-neutral-900/40'
                }`}
              >
                <div className="flex flex-col gap-0.5 truncate pr-2">
                  <span className="text-sm text-neutral-200 font-medium truncate">
                    {opp.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-neutral-500 uppercase">
                      {opp.sector || 'General'}
                    </span>
                    <span className="text-neutral-600 text-xs">•</span>
                    <span className="font-mono text-[10px] text-neutral-500 uppercase">
                      {opp.region || 'Global'}
                    </span>
                    {/* Rank badges — only on hybrid server results */}
                    {opp.source === 'hybrid' && (
                      <span
                        className="font-mono text-[9px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded"
                        title={
                          opp.vectorSimilarity && opp.vectorSimilarity > 0
                            ? `RRF ${opp.rrfScore?.toFixed(4)} · cosine ${(opp.vectorSimilarity * 100).toFixed(0)}%`
                            : `RRF ${opp.rrfScore?.toFixed(4)}`
                        }
                      >
                        {opp.vectorSimilarity && opp.vectorSimilarity > 0
                          ? 'Semantic Match'
                          : 'Hybrid RRF'}
                      </span>
                    )}
                  </div>
                </div>
                {opp.feasibility_score !== undefined && (
                  <span className="font-mono text-xs text-emerald-400 shrink-0">
                    {opp.feasibility_score}%
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Provenance footer — which search leg produced these rows */}
        <div className="px-4 py-2 border-t border-neutral-800 flex items-center justify-between font-mono text-[10px] text-neutral-500">
          <span>{useServer ? 'HYBRID RRF · VOYAGE-4 + FTS' : 'CLIENT FUZZY'}</span>
          <span>↑↓ NAVIGATE · ↵ OPEN</span>
        </div>
      </div>
    </div>
  );
}
