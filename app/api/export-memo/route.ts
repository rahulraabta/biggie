import { NextResponse } from 'next/server';
import type { MemoChunkPayload, MemoPayload, MemoUiFilters } from '@/store/memo-state';

/**
 * POST /api/export-memo
 *
 * Renders the client-side "Smart Memo" state (store/memo-state.ts) into a
 * structured Markdown document: search context, active filter scope, the vector
 * chunks the analyst selected, and a coverage summary.
 *
 * Request body: a `MemoPayload` exactly as produced by `getMemoPayload()`.
 * Response: `{ success, filename, chunkCount, stats, markdown }`.
 * With `?format=markdown` (or `Accept: text/markdown`) the Markdown is returned
 * directly as a downloadable file.
 */

/**
 * Payload versions this route can render. Kept in sync with
 * MEMO_PAYLOAD_VERSION in store/memo-state.ts, which is a client module and so
 * cannot be imported for its runtime value from a server route handler.
 */
const SUPPORTED_PAYLOAD_VERSIONS: readonly number[] = [1];

/** Guardrail: a memo this large is almost certainly a malformed body. */
const MAX_MEMO_CHUNKS = 200;

const BANDS = ['red', 'orange', 'green'] as const;
const SEARCH_STATUSES = ['idle', 'loading', 'ready', 'error'] as const;
const SORT_OPTIONS = ['highest_probability', 'most_recent', 'impact', 'feasibility'] as const;

const BAND_LABEL: Record<(typeof BANDS)[number], string> = {
  red: 'Red - high risk',
  orange: 'Orange - watch',
  green: 'Green - viable',
};

type ValidationResult =
  | { ok: true; payload: MemoPayload }
  | { ok: false; status: number; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function validateChunk(raw: unknown, index: number, errors: string[]): MemoChunkPayload | null {
  if (!isRecord(raw)) {
    errors.push(`chunks[${index}] must be an object.`);
    return null;
  }

  const { id, title, rank, band } = raw;

  if (!isFiniteNumber(id)) {
    errors.push(`chunks[${index}].id must be a number.`);
    return null;
  }
  if (typeof title !== 'string') {
    errors.push(`chunks[${index}].title must be a string.`);
    return null;
  }
  if (!isFiniteNumber(rank)) {
    errors.push(`chunks[${index}].rank must be a number.`);
    return null;
  }
  if (!isFiniteNumber(raw.rrfScore)) {
    errors.push(`chunks[${index}].rrfScore must be a number.`);
    return null;
  }
  if (!isOneOf(band, BANDS)) {
    errors.push(`chunks[${index}].band must be one of: ${BANDS.join(', ')}.`);
    return null;
  }

  return {
    id,
    title,
    rank,
    rrfScore: raw.rrfScore,
    vectorSimilarity: isFiniteNumber(raw.vectorSimilarity) ? raw.vectorSimilarity : 0,
    textScore: isFiniteNumber(raw.textScore) ? raw.textScore : 0,
    sector: typeof raw.sector === 'string' ? raw.sector : null,
    region: typeof raw.region === 'string' ? raw.region : null,
    band,
    excerpt: typeof raw.excerpt === 'string' ? raw.excerpt : null,
  };
}

/**
 * Structural validation of an untrusted memo payload.
 *
 * The optional `stats` block is intentionally ignored: coverage is recomputed
 * from the chunks this route actually renders, so a stale client summary can
 * never disagree with the document body.
 */
export function validateMemoPayload(body: unknown): ValidationResult {
  if (!isRecord(body)) {
    return { ok: false, status: 400, error: 'Request body must be a JSON object.' };
  }

  if (!isFiniteNumber(body.version) || !SUPPORTED_PAYLOAD_VERSIONS.includes(body.version)) {
    return {
      ok: false,
      status: 400,
      error: `Unsupported memo payload version. Expected ${SUPPORTED_PAYLOAD_VERSIONS.join(' or ')}.`,
    };
  }

  if (!isRecord(body.query)) {
    return { ok: false, status: 400, error: "Missing required 'query' object." };
  }
  if (typeof body.query.text !== 'string') {
    return { ok: false, status: 400, error: "Missing required 'query.text' string." };
  }
  if (!isOneOf(body.query.status, SEARCH_STATUSES)) {
    return {
      ok: false,
      status: 400,
      error: `'query.status' must be one of: ${SEARCH_STATUSES.join(', ')}.`,
    };
  }

  if (!Array.isArray(body.chunks)) {
    return { ok: false, status: 400, error: "Missing required 'chunks' array." };
  }
  if (body.chunks.length > MAX_MEMO_CHUNKS) {
    return {
      ok: false,
      status: 400,
      error: `Too many chunks: ${body.chunks.length} (maximum ${MAX_MEMO_CHUNKS}).`,
    };
  }

  const errors: string[] = [];
  const chunks = body.chunks
    .map((chunk, index) => validateChunk(chunk, index, errors))
    .filter((chunk): chunk is MemoChunkPayload => chunk !== null);

  if (errors.length > 0) {
    return { ok: false, status: 400, error: `Invalid chunk payload: ${errors[0]}` };
  }

  const rawFilters = isRecord(body.filters) ? body.filters : {};
  const filters: MemoUiFilters = {
    band: isOneOf(rawFilters.band, [...BANDS, 'all'] as const) ? rawFilters.band : 'all',
    sector: typeof rawFilters.sector === 'string' ? rawFilters.sector : 'all',
    region: typeof rawFilters.region === 'string' ? rawFilters.region : 'all',
    type: typeof rawFilters.type === 'string' ? rawFilters.type : 'all',
    sort: isOneOf(rawFilters.sort, SORT_OPTIONS) ? rawFilters.sort : 'highest_probability',
  };

  // Only a completed run may advertise results or a run time; idle, loading and
  // errored searches all report an empty run.
  const isReady = body.query.status === 'ready';
  const resultCount = isFiniteNumber(body.query.resultCount)
    ? Math.max(0, Math.trunc(body.query.resultCount))
    : 0;
  const lastRunAt =
    typeof body.query.lastRunAt === 'string' && !Number.isNaN(Date.parse(body.query.lastRunAt))
      ? new Date(body.query.lastRunAt).toISOString()
      : null;

  return {
    ok: true,
    payload: {
      version: 1,
      generatedAt:
        typeof body.generatedAt === 'string' && !Number.isNaN(Date.parse(body.generatedAt))
          ? body.generatedAt
          : new Date().toISOString(),
      query: {
        text: body.query.text,
        strategy: 'hybrid-rrf',
        status: body.query.status,
        resultCount: isReady ? resultCount : 0,
        lastRunAt: isReady ? lastRunAt : null,
      },
      chunks,
      filters,
      stats: {
        selectedChunkCount: chunks.length,
        distinctSectors: new Set(
          chunks.map((chunk) => chunk.sector).filter((sector): sector is string => Boolean(sector))
        ).size,
        distinctRegions: new Set(
          chunks.map((chunk) => chunk.region).filter((region): region is string => Boolean(region))
        ).size,
        hasActiveFilters:
          filters.band !== 'all' ||
          filters.sector !== 'all' ||
          filters.region !== 'all' ||
          filters.type !== 'all' ||
          filters.sort !== 'highest_probability',
      },
    },
  };
}

const INLINE_ESCAPE_RE = /[\\`*_[\]<>|#]/g;
const EM_DASH = '\u2014';

/**
 * Collapses whitespace and escapes Markdown syntax, so memo text (titles and
 * excerpts come straight from ingested news) can never restructure the document.
 */
function inline(value: string | null | undefined, fallback: string = EM_DASH): string {
  if (typeof value !== 'string') return fallback;
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.replace(INLINE_ESCAPE_RE, (char) => `\\${char}`) : fallback;
}

/** Single-backtick code span; falls back to escaping when the text has backticks. */
function codeSpan(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return EM_DASH;
  if (text.includes('`')) return inline(text);
  return '`' + text + '`';
}

function formatScore(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(6))) : '0';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '');
}

/** Suggested download name, e.g. `smart-memo-2026-09-17-green-hydrogen.md`. */
export function memoFilename(payload: MemoPayload): string {
  const date = payload.generatedAt.slice(0, 10);
  const slug = slugify(payload.query.text);
  return `smart-memo-${date}${slug ? `-${slug}` : ''}.md`;
}

/** Renders a validated memo payload into the exported Markdown document. */
export function renderMemoMarkdown(payload: MemoPayload): string {
  const { query, chunks, filters, stats } = payload;
  const lines: string[] = [];

  lines.push(`# Smart Memo ${EM_DASH} ${query.text.trim() ? inline(query.text) : 'Untitled session'}`);
  lines.push('');
  lines.push(
    `> Generated ${inline(payload.generatedAt)} ${EM_DASH} payload v${payload.version} ${EM_DASH} strategy ${codeSpan(
      query.strategy
    )} ${EM_DASH} ${stats.selectedChunkCount} selected chunk${stats.selectedChunkCount === 1 ? '' : 's'}`
  );
  lines.push('');

  lines.push('## Search context');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Query | ${codeSpan(query.text)} |`);
  lines.push(
    `| Status | ${inline(query.status)}${query.status === 'ready' ? '' : ' (no completed run)'} |`
  );
  lines.push(`| Results in last run | ${query.status === 'ready' ? query.resultCount : 0} |`);
  lines.push(`| Last run | ${query.lastRunAt ? inline(query.lastRunAt) : 'not run'} |`);
  lines.push('');

  lines.push('## Active filters');
  lines.push('');
  if (stats.hasActiveFilters) {
    lines.push('| Facet | Value |');
    lines.push('| --- | --- |');
    lines.push(`| Viability band | ${inline(filters.band)} |`);
    lines.push(`| Sector | ${inline(filters.sector)} |`);
    lines.push(`| Region | ${inline(filters.region)} |`);
    lines.push(`| Opportunity type | ${inline(filters.type)} |`);
    lines.push(`| Sort | ${inline(filters.sort)} |`);
  } else {
    lines.push('_No filters applied - the dashboard scope is unrestricted._');
  }
  lines.push('');

  lines.push(`## Selected evidence (${chunks.length})`);
  lines.push('');
  if (chunks.length === 0) {
    lines.push('_No vector chunks were selected for this memo._');
    lines.push('');
  }
  chunks.forEach((chunk, index) => {
    const title = chunk.title.trim() ? inline(chunk.title) : `Opportunity ${chunk.id}`;
    lines.push(`### ${index + 1}. ${title}`);
    lines.push('');
    lines.push(
      `**${inline(BAND_LABEL[chunk.band], chunk.band)}** ${EM_DASH} rank ${chunk.rank} ${EM_DASH} RRF ${codeSpan(
        formatScore(chunk.rrfScore)
      )}`
    );
    lines.push('');
    lines.push(
      `- Opportunity ID: ${chunk.id}; sector: ${inline(
        chunk.sector,
        'unspecified'
      )}; region: ${inline(chunk.region, 'global')}`
    );
    lines.push(
      `- Vector similarity: ${codeSpan(formatScore(chunk.vectorSimilarity))} ${EM_DASH} lexical score: ${codeSpan(
        formatScore(chunk.textScore)
      )}`
    );
    if (chunk.excerpt && chunk.excerpt.trim()) {
      lines.push(`- Excerpt: ${inline(chunk.excerpt)}`);
    }
    lines.push('');
  });

  lines.push('## Coverage');
  lines.push('');
  lines.push(`- Selected chunks: ${stats.selectedChunkCount}`);
  lines.push(`- Distinct sectors: ${stats.distinctSectors}`);
  lines.push(`- Distinct regions: ${stats.distinctRegions}`);
  lines.push(`- Active filters: ${stats.hasActiveFilters ? 'yes' : 'no'}`);
  lines.push('');

  return lines.join('\n');
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const validated = validateMemoPayload(body);
  if (!validated.ok) {
    return NextResponse.json(
      { success: false, error: validated.error },
      { status: validated.status }
    );
  }

  const { payload } = validated;
  if (!payload.query.text.trim() && payload.chunks.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Memo is empty: run a search or select at least one chunk before exporting.',
      },
      { status: 422 }
    );
  }

  try {
    const markdown = renderMemoMarkdown(payload);
    const filename = memoFilename(payload);
    const wantsMarkdown =
      new URL(request.url).searchParams.get('format') === 'markdown' ||
      (request.headers.get('accept') ?? '').includes('text/markdown');

    if (wantsMarkdown) {
      return new Response(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      filename,
      chunkCount: payload.chunks.length,
      stats: payload.stats,
      markdown,
    });
  } catch (err: any) {
    console.error('[API Export Memo Route] Failed to render memo:', err?.message || err);
    return NextResponse.json(
      { success: false, error: 'Failed to render memo document.' },
      { status: 500 }
    );
  }
}