'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Pause, Play, Radio } from 'lucide-react';

interface NewsEvent {
  id: number;
  title: string;
  url: string;
  country_code: string | null;
  published_at: string;
}

export function LiveTicker({ motionMode = 'full', refreshVersion = 0 }: { motionMode?: 'full' | 'reduced' | 'static'; refreshVersion?: number }) {
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [status, setStatus] = useState<'loading' | 'live' | 'unavailable'>('loading');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let controller: AbortController | undefined;
    let disposed = false;
    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch('/api/news', { signal: controller.signal, cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.events)) throw new Error('Feed unavailable');
        if (disposed) return;
        setEvents(data.events.filter((event: NewsEvent) => /^https?:\/\//i.test(event.url)));
        setStatus('live');
      } catch (error) {
        if (!disposed && (error as Error).name !== 'AbortError') setStatus('unavailable');
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    return () => { disposed = true; clearInterval(timer); controller?.abort(); };
  }, [refreshVersion]);

  return (
    <section aria-label="Recent GDELT news" className="live-ticker relative z-10 flex h-11 min-w-0 items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur-md text-slate-200" data-paused={paused || motionMode !== 'full'}>
      <div className="flex h-full shrink-0 items-center gap-2 border-r border-slate-800 px-2.5 sm:px-4 font-mono text-[10px] font-semibold tracking-widest">
        <Radio className={`h-3.5 w-3.5 ${status === 'live' ? 'text-emerald-400' : 'text-slate-500'}`} />
        <span className="hidden sm:inline">LIVE TICKER</span>
        <span className="sm:hidden">LIVE</span>
        <span role="status" className={`hidden sm:inline ${status === 'live' ? 'text-emerald-400' : 'text-slate-500'}`}>{status === 'live' ? 'GDELT' : status === 'loading' ? 'CONNECTING' : 'OFFLINE'}</span>
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%_-_24px),transparent)]">
        {events.length ? (
          <div className="live-ticker-track flex w-max" style={{ '--ticker-duration': `${Math.max(60, events.length * 12)}s` } as CSSProperties}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex min-w-[100vw] shrink-0 items-center justify-around" aria-hidden={copy === 1 ? true : undefined}>
                {events.map((event) => (
                  <a key={event.id} href={event.url} target="_blank" rel="noopener noreferrer" tabIndex={copy === 1 ? -1 : 0} className="flex shrink-0 items-center gap-3 whitespace-nowrap px-6 py-2 text-xs transition-colors hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-400">
                    <span className="font-mono text-[10px] text-emerald-400">{event.country_code || 'GLOBAL'}</span>
                    <span className="max-w-[48ch] truncate sm:max-w-[72ch]">{event.title}</span>
                    <ArrowUpRight className="h-3 w-3 text-slate-500" />
                    <span className="ml-3 text-slate-700">/</span>
                  </a>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-6 font-mono text-[11px] text-slate-500">{status === 'loading' ? 'Connecting to global news feed…' : status === 'unavailable' ? 'News feed unavailable. Retrying automatically.' : 'No GDELT events in the last 24 hours.'}</p>
        )}
      </div>
      <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Resume news ticker' : 'Pause news ticker'} aria-pressed={paused} disabled={motionMode !== 'full' || events.length === 0} className="flex h-full w-10 shrink-0 items-center justify-center border-l border-slate-800 text-slate-400 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:opacity-40">
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </button>
    </section>
  );
}
