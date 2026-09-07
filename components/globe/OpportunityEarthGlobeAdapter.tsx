'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GlobeProps } from './globe-types';
import { GlobeCanvas } from './GlobeCanvas';
import { GlobeControls } from './GlobeControls';
import { WorldFallback } from '../map/WorldFallback';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export const OpportunityEarthGlobeAdapter: React.FC<GlobeProps> = ({
  points,
  selectedCountryCode,
  selectedRegionName,
  selectedMarketId,
  onSelectCountry,
  onResetView,
  isAutoRotate,
  onToggleAutoRotate,
  motionMode,
  onMotionModeChange,
  globeImageUrl,
  bumpImageUrl,
  opportunities,
  onSelectOpportunity,
  focusTarget,
}) => {
  const [hasWebGlSupport, setHasWebGlSupport] = useState<boolean>(true);
  const [activeHoverPoint, setActiveHoverPoint] = useState<string | null>(null);

  // Map API opportunity items → globe pin inputs, skipping entries without pin coordinates
  const opportunityPins = useMemo(() => {
    if (!opportunities) return [];
    return opportunities
      .filter((o) => typeof o.latitude === 'number' && typeof o.longitude === 'number')
      .map((o) => ({
        id: o.id,
        title: o.title,
        sector: o.dominant_sector || 'general',
        band: o.band,
        latitude: o.latitude as number,
        longitude: o.longitude as number,
        goldsteinDelta: typeof o.goldstein_delta === 'number' ? o.goldstein_delta : undefined,
        probabilityScore: o.probability_score,
      }));
  }, [opportunities]);

  // Check WebGL availability
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGlSupport(false);
      }
    } catch {
      setHasWebGlSupport(false);
    }
  }, []);

  if (!hasWebGlSupport) {
    return (
      <WorldFallback
        points={points}
        selectedCountryCode={selectedCountryCode}
        onSelectCountry={onSelectCountry}
        onResetView={onResetView}
      />
    );
  }

  return (
    /* Dedicated globe viewport: flex-sized (no fragile h-full percentage chain), Earth dead-center */
    <div className="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-black">
      {/* Full-bleed 3D Earth: Blue Marble texture + starfield + black clear color */}
      <GlobeCanvas
        points={points}
        selectedCountryCode={selectedCountryCode}
        onSelectCountry={onSelectCountry}
        onResetView={onResetView}
        isAutoRotate={isAutoRotate}
        motionMode={motionMode}
        globeImageUrl={globeImageUrl}
        bumpImageUrl={bumpImageUrl}
        opportunityPins={opportunityPins}
        onSelectOpportunity={onSelectOpportunity}
        focusTarget={focusTarget}
      />

      {/* Interactive Country Target Selector Chips */}
      <div className="absolute bottom-16 left-6 right-6 z-20 flex flex-wrap justify-center gap-2 max-w-4xl mx-auto pointer-events-auto">
        {points.map((pt) => {
          const isSelected = selectedCountryCode === pt.countryCode;
          const isHovered = activeHoverPoint === pt.countryCode;

          return (
            <motion.button
              key={pt.countryCode}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectCountry(pt.countryCode)}
              onMouseEnter={() => setActiveHoverPoint(pt.countryCode)}
              onMouseLeave={() => setActiveHoverPoint(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all duration-300 flex items-center space-x-2 backdrop-blur-md shadow-sm ${
                isSelected
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-md ring-1 ring-emerald-500/50'
                  : isHovered
                  ? 'bg-white/10 border-emerald-500/50 text-slate-100 shadow-md'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-emerald-500/40'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-300' : 'text-emerald-400'}`} />
              <span>{pt.countryName}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  pt.topOpportunityBand === 'green'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                    : pt.topOpportunityBand === 'red'
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                }`}
              >
                {pt.signalCount}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Floating HUD Controls Overlay */}
      <GlobeControls
        selectedCountryCode={selectedCountryCode}
        selectedRegionName={selectedRegionName}
        selectedMarketId={selectedMarketId}
        onResetView={onResetView}
        isAutoRotate={isAutoRotate}
        onToggleAutoRotate={onToggleAutoRotate}
        motionMode={motionMode}
        onMotionModeChange={onMotionModeChange}
        activePointCount={points.length}
      />
    </div>
  );
};
