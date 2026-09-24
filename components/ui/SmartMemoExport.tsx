'use client';

import { useCallback, useState } from 'react';
import { useMemoStore } from '@/store/memo-state';

/** Name requested for the downloaded document. */
const DOWNLOAD_FILENAME = 'session-memo.md';

interface ExportMemoResponse {
  success?: boolean;
  markdown?: string;
  error?: string;
}

/**
 * "Download Smart Memo" button.
 *
 * Serializes the current Smart Memo state with `getMemoPayload()`, posts it to
 * POST /api/export-memo, and saves the returned Markdown as a file.
 */
export function SmartMemoExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Primitive selectors only — zustand v5 compares with Object.is, so a
  // selector returning a fresh object would re-render forever.
  const queryText = useMemoStore((state) => state.query.text);
  const chunkCount = useMemoStore((state) => state.chunks.length);

  const hasMemoContent = queryText.trim().length > 0 || chunkCount > 0;
  const isDisabled = isExporting || !hasMemoContent;

  const handleExport = useCallback(async () => {
    if (isExporting || !hasMemoContent) return;

    setIsExporting(true);
    setError(null);
    let objectUrl: string | null = null;

    try {
      const payload = useMemoStore.getState().getMemoPayload();

      const response = await fetch('/api/export-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: ExportMemoResponse | null = await response.json().catch(() => null);
      const markdown = data?.markdown;

      if (!response.ok || !data?.success || typeof markdown !== 'string') {
        throw new Error(data?.error || `Memo export failed (HTTP ${response.status}).`);
      }

      objectUrl = URL.createObjectURL(
        new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
      );

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = DOWNLOAD_FILENAME;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Memo export failed.');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setIsExporting(false);
    }
  }, [hasMemoContent, isExporting]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={isDisabled}
        aria-busy={isExporting}
        title={hasMemoContent ? 'Export this session as Markdown' : 'Run a search or select a chunk first'}
        className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium tracking-wide text-indigo-100 transition-colors hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? (
          <span
            aria-hidden="true"
            className="h-3 w-3 animate-spin rounded-full border border-indigo-200/40 border-t-indigo-100"
          />
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {isExporting ? 'Preparing memo...' : 'Download Smart Memo'}
      </button>

      {error ? (
        <p role="alert" className="max-w-xs text-right text-[11px] leading-tight text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default SmartMemoExport;
