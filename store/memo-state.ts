'use client';

import { create } from 'zustand';

/**
 * Smart Memo state.
 *
 * Holds everything the "Export Memo" flow needs to describe the analyst's
 * current working context:
 *
 *   - `query`   — the live RRF (vector + lexical) search query behind
 *                 /api/search, including whether the last run completed.
 *   - `chunks`  — the vector-search hits the analyst explicitly selected,
 *                 in selection order.
 *   - `filters` — the active dashboard filters, mirroring the grid filter
 *                 state in app/page.tsx so the memo cites the same scope the
 *                 analyst is looking at.
 *
 * `getMemoPayload()` folds all three into a single JSON-safe object; raw
 * voyage-4 embeddings are deliberately stripped (see MemoVectorChunk).
 */

/** Bumped whenever the serialized payload shape changes. */
export const MEMO_PAYLOAD_VERSION = 1;

/** Viability bands as stored on `opportunities.band`. */
export type ViabilityBand = 'red' | 'orange' | 'green';

/** How the RRF (Reciprocal Rank Fusion) search currently stands. */
export type MemoSearchStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Sort tokens accepted by GET /api/opportunities?sort= (plus its default). */
export type MemoSortOption = 'highest_probability' | 'most_recent' | 'impact' | 'feasibility';

/** 'all' is the dashboard's "no restriction" sentinel for a filter facet. */
export type MemoFilterValue<T extends string> = T | 'all';

/**
 * Active dashboard filters. Field names and sentinel values match the filter
 * state in app/page.tsx, so a memo payload can be replayed as a query string
 * against GET /api/opportunities.
 */
export interface MemoUiFilters {
  /** Viability band facet; 'all' means unfiltered. */
  band: MemoFilterValue<ViabilityBand>;
  /** Sector label from `story_clusters.dominant_sector`; 'all' means unfiltered. */
  sector: string;
  /** ISO-3166 alpha-2 market code (already FIPS-normalized); 'all' means unfiltered. */
  region: string;
  /** Opportunity type (e.g. 'regulatory'); 'all' means unfiltered. */
  type: string;
  /** Result ordering; 'feasibility' is the API's fallback ordering. */
  sort: MemoSortOption;
}

/** The RRF search the memo is built around. */
export interface MemoSearchQuery {
  /** Raw query text; empty until the analyst types one. */
  text: string;
  /**
   * Lifecycle of the last search. Only 'ready' means `resultCount` is backed by
   * a completed run — aborted or superseded requests land back in 'idle'.
   */
  status: MemoSearchStatus;
  /** Results returned by the last completed run; 0 while idle/loading/errored. */
  resultCount: number;
  /** Epoch ms of the last completed run, or null if it never completed. */
  lastRunAt: number | null;
}

/**
 * One selected hit from the hybrid search. Field names follow
 * `SemanticSearchResult` in src/services/embeddingService.ts.
 */
export interface MemoVectorChunk {
  /** `opportunities.id` — also the dedupe key for selections. */
  id: number;
  title: string;
  /** 1-based position in the RRF result list this chunk came from. */
  rank: number;
  /** Reciprocal rank fusion score: 1/(60 + vector_rank) + 1/(60 + text_rank). */
  rrfScore: number;
  /** Cosine similarity from the vector leg; 0 when it matched on FTS only. */
  vectorSimilarity: number;
  /** ts_rank_cd cover density from the lexical leg; 0 when vector-only. */
  textScore: number;
  sector: string | null;
  region: string | null;
  band: ViabilityBand;
  /** Trimmed short_description; null when the opportunity has none. */
  excerpt: string | null;
  /**
   * Raw voyage-4 embedding (EMBEDDING_DIMENSIONS = 1024 floats). Optional, and
   * intentionally dropped by `buildMemoPayload` — keeping it would add
   * megabytes of floats to every exported memo.
   */
  embedding?: number[];
}

/** A chunk as it appears in the exported payload — no embedding. */
export type MemoChunkPayload = Omit<MemoVectorChunk, 'embedding'>;

export interface MemoPayloadStats {
  /** Number of selected chunks in the memo. */
  selectedChunkCount: number;
  /** Distinct non-null sectors across the selected chunks. */
  distinctSectors: number;
  /** Distinct non-null regions across the selected chunks. */
  distinctRegions: number;
  /** True when at least one filter facet differs from the default scope. */
  hasActiveFilters: boolean;
}

/**
 * The exported memo shape: plain JSON values only (no undefined, no class
 * instances, no embeddings), so `JSON.stringify` round-trips it losslessly.
 */
export interface MemoPayload {
  version: typeof MEMO_PAYLOAD_VERSION;
  /** ISO-8601 timestamp of serialization. */
  generatedAt: string;
  query: {
    text: string;
    strategy: 'hybrid-rrf';
    status: MemoSearchStatus;
    resultCount: number;
    /** ISO-8601, or null when no search has completed. */
    lastRunAt: string | null;
  };
  /** Selected chunks, oldest selection first. */
  chunks: MemoChunkPayload[];
  filters: MemoUiFilters;
  stats: MemoPayloadStats;
}

/** Default filter scope — mirrors the initial filter state in app/page.tsx. */
export const DEFAULT_MEMO_FILTERS: Readonly<MemoUiFilters> = Object.freeze({
  band: 'all',
  sector: 'all',
  region: 'all',
  type: 'all',
  sort: 'highest_probability',
});

/** Fresh, empty search state. */
function createInitialQuery(): MemoSearchQuery {
  return { text: '', status: 'idle', resultCount: 0, lastRunAt: null };
}

/**
 * float8 columns can arrive from `pg` as strings, and raw fusion scores carry
 * far more precision than a memo needs — coerce and round so the payload stays
 * numerically typed and readable.
 */
function roundScore(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(6)) : 0;
}

/** Explicit field copy so a future field on MemoVectorChunk can never leak. */
function toChunkPayload(chunk: MemoVectorChunk): MemoChunkPayload {
  return {
    id: chunk.id,
    title: chunk.title,
    rank: chunk.rank,
    rrfScore: roundScore(chunk.rrfScore),
    vectorSimilarity: roundScore(chunk.vectorSimilarity),
    textScore: roundScore(chunk.textScore),
    sector: chunk.sector,
    region: chunk.region,
    band: chunk.band,
    excerpt: chunk.excerpt,
  };
}

function countDistinct(values: Array<string | null>): number {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

/**
 * Serializes memo state into a clean, JSON-safe payload.
 *
 * Pure and framework-free (no store or React access), so it can be unit tested
 * directly and reused from any caller that already holds the three slices.
 *
 * @param state   The `query` / `chunks` / `filters` slices to serialize.
 * @param now     Timestamp used for `generatedAt`; injectable for tests.
 */
export function buildMemoPayload(
  state: Pick<MemoState, 'query' | 'chunks' | 'filters'>,
  now: Date = new Date()
): MemoPayload {
  const { query, chunks, filters } = state;
  // A payload must never advertise results or a run time that no completed
  // search backs: idle, loading, and errored runs all report an empty run.
  const hasCompletedRun = query.status === 'ready';

  return {
    version: MEMO_PAYLOAD_VERSION,
    generatedAt: now.toISOString(),
    query: {
      text: query.text.trim(),
      strategy: 'hybrid-rrf',
      status: query.status,
      resultCount: hasCompletedRun ? query.resultCount : 0,
      lastRunAt:
        hasCompletedRun && typeof query.lastRunAt === 'number'
          ? new Date(query.lastRunAt).toISOString()
          : null,
    },
    chunks: chunks.map(toChunkPayload),
    filters: { ...filters },
    stats: {
      selectedChunkCount: chunks.length,
      distinctSectors: countDistinct(chunks.map((chunk) => chunk.sector)),
      distinctRegions: countDistinct(chunks.map((chunk) => chunk.region)),
      hasActiveFilters: (Object.keys(DEFAULT_MEMO_FILTERS) as Array<keyof MemoUiFilters>).some(
        (key) => filters[key] !== DEFAULT_MEMO_FILTERS[key]
      ),
    },
  };
}

export interface MemoState {
  /** The live RRF search query. */
  query: MemoSearchQuery;
  /** Selected vector chunks, in selection order. */
  chunks: MemoVectorChunk[];
  /** Active dashboard filters. */
  filters: MemoUiFilters;

  /** Records new query text and marks the search in flight. */
  beginSearch: (text: string) => void;
  /** Records a completed run for `text` along with its result count. */
  completeSearch: (text: string, resultCount: number) => void;
  /** Marks a run as failed; drops the stale result count. */
  failSearch: (text: string) => void;
  /** Clears the query back to its idle state. */
  resetSearch: () => void;

  /** Adds `chunk` to the selection if absent, removes it if already selected. */
  toggleChunk: (chunk: MemoVectorChunk) => void;
  /** Adds `chunk` to the selection (no-op when already selected). */
  selectChunk: (chunk: MemoVectorChunk) => void;
  /** Removes the chunk with `id` from the selection. */
  deselectChunk: (id: number) => void;
  /** Empties the selection. */
  clearChunks: () => void;
  /** Whether the chunk with `id` is currently selected. */
  isChunkSelected: (id: number) => boolean;

  /** Sets a single filter facet. */
  setFilter: <K extends keyof MemoUiFilters>(key: K, value: MemoUiFilters[K]) => void;
  /** Merges a partial filter patch; omitted facets keep their current value. */
  patchFilters: (patch: Partial<MemoUiFilters>) => void;
  /** Restores the default filter scope. */
  resetFilters: () => void;

  /** Resets query, chunks, and filters. */
  resetMemo: () => void;

  /** Serializes the current state into a clean, JSON-safe payload. */
  getMemoPayload: (now?: Date) => MemoPayload;
  /** `JSON.stringify` of `getMemoPayload()` — the memo file contents. */
  getMemoJson: (space?: number) => string;
}

const initialState = {
  query: createInitialQuery(),
  chunks: [] as MemoVectorChunk[],
  filters: { ...DEFAULT_MEMO_FILTERS } as MemoUiFilters,
};

/**
 * Smart Memo store.
 *
 * Imperative reads (e.g. building the payload inside a click handler) should go
 * through `useMemoStore.getState()` — see `getMemoPayload`. Avoid subscribing
 * with a selector that builds a new object, since zustand v5 compares with
 * `Object.is`, and a fresh object on every render would loop.
 */
export const useMemoStore = create<MemoState>()((set, get) => ({
  ...initialState,

  beginSearch: (text) =>
    set((state) => ({
      query: { ...state.query, text, status: 'loading', resultCount: 0, lastRunAt: null },
    })),

  completeSearch: (text, resultCount) =>
    set((state) => ({
      query: {
        text,
        status: 'ready',
        resultCount: Math.max(0, Math.trunc(resultCount)),
        lastRunAt: Date.now(),
      },
      // A new result set invalidates selections made from the previous one.
      chunks: state.query.text === text ? state.chunks : [],
    })),

  failSearch: (text) =>
    set((state) => ({
      query: { ...state.query, text, status: 'error', resultCount: 0, lastRunAt: null },
    })),

  resetSearch: () => set({ query: createInitialQuery() }),

  toggleChunk: (chunk) =>
    set((state) => {
      const isSelected = state.chunks.some((c) => c.id === chunk.id);
      return {
        chunks: isSelected
          ? state.chunks.filter((c) => c.id !== chunk.id)
          : [...state.chunks, { ...chunk }],
      };
    }),

  selectChunk: (chunk) =>
    set((state) =>
      state.chunks.some((c) => c.id === chunk.id)
        ? state
        : { chunks: [...state.chunks, { ...chunk }] }
    ),

  deselectChunk: (id) => set((state) => ({ chunks: state.chunks.filter((c) => c.id !== id) })),

  clearChunks: () => set({ chunks: [] }),

  isChunkSelected: (id) => get().chunks.some((chunk) => chunk.id === id),

  setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),

  patchFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),

  resetFilters: () => set({ filters: { ...DEFAULT_MEMO_FILTERS } }),

  resetMemo: () =>
    set({ query: createInitialQuery(), chunks: [], filters: { ...DEFAULT_MEMO_FILTERS } }),

  getMemoPayload: (now) => buildMemoPayload(get(), now),

  getMemoJson: (space = 2) => JSON.stringify(buildMemoPayload(get()), null, space),
}));
