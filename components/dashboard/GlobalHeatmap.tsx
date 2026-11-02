'use client';

import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { numericToAlpha2 } from 'i18n-iso-countries';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { FeatureCollection, Geometry } from 'geojson';
import world from 'world-atlas/countries-110m.json';
import { Globe } from 'lucide-react';

interface HeatmapRegion { code: string; count: number }
const shades = ['#0f172a', '#064e3b', '#065f46', '#059669', '#10b981', '#34d399'];
const countries = (feature(world as unknown as Topology, world.objects.countries as unknown as GeometryCollection) as FeatureCollection<Geometry, { name: string }>).features.filter((country) => String(country.id) !== '010');
const projection = geoNaturalEarth1().fitSize([900, 420], { type: 'FeatureCollection', features: countries });
const path = geoPath(projection);

function regionName(code: string) {
  if (code === 'GLOBAL') return 'Global / unspecified';
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch { return code; }
}

export function GlobalHeatmap({ refreshVersion = 0, selectedRegion = 'all', onRegionSelect }: { refreshVersion?: number; selectedRegion?: string; onRegionSelect: (region: string) => void }) {
  const [regions, setRegions] = useState<HeatmapRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch('/api/map/heatmap', { signal: controller.signal, cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('Heatmap unavailable');
        setRegions(data.regions);
        setError(false);
      } catch (err) { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [refreshVersion]);
  const counts = useMemo(() => new Map(regions.map((region) => [region.code, region.count])), [regions]);
  const max = Math.max(1, ...regions.map((region) => region.count));
  const total = regions.reduce((sum, region) => sum + region.count, 0);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-md" aria-label="Global opportunity heatmap">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div><h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-slate-200"><Globe className="h-4 w-4 text-emerald-400" />Global Heatmap</h2><p className="mt-1 text-xs text-slate-500">New opportunities by region · Rolling 24 hours</p></div>
        <span className="font-mono text-xs text-emerald-400" role="status">{loading ? 'Loading…' : error ? 'Data temporarily unavailable' : `${total} opportunities`}</span>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 p-4">
          <svg viewBox="0 0 900 420" className="w-full" aria-label="Countries shaded by recent opportunity count">
            <title>Opportunity density in the last 24 hours</title>
            {countries.map((country) => {
              const code = numericToAlpha2(String(country.id).padStart(3, '0')) || '';
              const count = counts.get(code) || 0;
              const color = count ? shades[Math.max(1, Math.ceil(Math.log1p(count) / Math.log1p(max) * 5))] : shades[0];
              const label = `${country.properties.name}: ${count} new opportunities`;
              return <path key={country.id} d={path(country) || ''} fill={color} stroke={selectedRegion === code ? '#e2e8f0' : '#334155'} strokeWidth={selectedRegion === code ? 1.5 : 0.5} className="transition-colors duration-500 outline-none hover:stroke-emerald-300 focus-visible:stroke-white" tabIndex={count ? 0 : -1} role={count ? 'button' : undefined} aria-label={label} onClick={() => { if (count) onRegionSelect(code); }} onKeyDown={(event) => { if (count && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onRegionSelect(code); } }}><title>{label}</title></path>;
            })}
          </svg>
          <div className="mt-2 flex items-center justify-center gap-2 font-mono text-[10px] text-slate-500"><span>0</span>{shades.map((shade) => <span key={shade} className="h-2 w-8 rounded-sm" style={{ backgroundColor: shade }} />)}<span>{max}</span></div>
        </div>
        <div className="border-t border-slate-800 p-4 lg:border-l lg:border-t-0">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">Most active regions</h3>
          {!loading && !error && !regions.length && <p className="text-xs text-slate-500">No opportunities in the last 24 hours.</p>}
          {regions.slice(0, 10).map((region, index) => <button type="button" key={region.code} onClick={() => onRegionSelect(region.code)} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 focus-visible:outline-emerald-400"><span className="w-4 font-mono text-[10px] text-slate-600">{index + 1}</span><span className="min-w-0 flex-1 truncate">{regionName(region.code)}</span><span className="font-mono tabular-nums text-emerald-400">{region.count}</span></button>)}
        </div>
      </div>
    </section>
  );
}
