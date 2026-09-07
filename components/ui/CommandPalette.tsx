'use client';

import React, { useState, useEffect, useMemo } from 'react';

export interface OpportunityItem {
  id: number;
  title: string;
  short_description?: string;
  sector?: string;
  region?: string;
  feasibility_score?: number;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOpportunity: (opp: OpportunityItem) => void;
  opportunities?: OpportunityItem[];
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectOpportunity,
  opportunities = [],
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query.trim()) return opportunities.slice(0, 8);
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
      .slice(0, 8);
  }, [opportunities, query]);

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
      </div>
    </div>
  );
}