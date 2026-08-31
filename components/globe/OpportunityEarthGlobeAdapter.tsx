'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GlobeProps } from './globe-types';
import { Globe, GlobeConfig } from '@/components/ui/globe';
import { GlobeControls } from './GlobeControls';
import { WorldFallback } from '../map/WorldFallback';
import { getCountryCoordinates } from '@/src/utils/geoUtils';
import { Globe2, MapPin } from 'lucide-react';

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
}) => {
  const [hasWebGlSupport, setHasWebGlSupport] = useState<boolean>(true);
  const [activeHoverPoint, setActiveHoverPoint] = useState<string | null>(null);

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

  // Map OpportunityMapPoint[] -> Cobe Marker[]
  const cobeMarkers = useMemo(() => {
    return points.map((pt) => {
      // Color based on viability band
      let color: [number, number, number] = [0.96, 0.62, 0.18]; // Amber (medium)
      if (pt.topOpportunityBand === 'green') {
        color = [0.06, 0.78, 0.52]; // Emerald (high)
      } else if (pt.topOpportunityBand === 'red') {
        color = [0.94, 0.32, 0.32]; // Oxide Red (low)
      }

      // Highlight hovered or selected point
      if (pt.countryCode === activeHoverPoint || pt.countryCode === selectedCountryCode) {
        color = [0.2, 0.7, 1.0]; // Bright cyan highlight
      }

      // Calculate size based on signal count
      const rawSize = 0.04 + (pt.signalCount / 300) * 0.08;
      const size = Math.min(0.12, Math.max(0.04, rawSize));

      return {
        location: [pt.lat, pt.lng] as [number, number],
        size,
        color,
        id: pt.countryCode,
      };
    });
  }, [points, selectedCountryCode, activeHoverPoint]);

  // Calculate target targetPhi / targetTheta for country selection
  const targetAngles = useMemo(() => {
    if (!selectedCountryCode) return null;
    const coords = getCountryCoordinates(selectedCountryCode);
    // Cobe convention:
    // phi: longitude in radians centered to face camera (-lng in radians)
    // theta: latitude in radians (lat in radians)
    const targetPhi = -(coords.lng * Math.PI) / 180;
    const targetTheta = (coords.lat * Math.PI) / 180;
    return { targetPhi, targetTheta };
  }, [selectedCountryCode]);

  // Determine auto-rotate speed based on motionMode & isAutoRotate
  const autoRotateSpeed = useMemo(() => {
    if (motionMode === 'static') return 0;
    if (!isAutoRotate) return 0;
    return motionMode === 'reduced' ? 0.001 : 0.003;
  }, [motionMode, isAutoRotate]);

  // Cobe config
  const globeConfig: GlobeConfig = useMemo(() => {
    return {
      width: 800,
      height: 800,
      devicePixelRatio: 2,
      phi: 0,
      theta: 0.3,
      dark: 1, // Dark orbital field manual mode
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 2.2,
      baseColor: [0.1, 0.14, 0.22], // Deep charcoal/navy base
      markerColor: [0.96, 0.62, 0.18],
      glowColor: [0.08, 0.3, 0.5], // Oxidized copper glow
      markers: cobeMarkers,
      isAutoRotate: isAutoRotate && motionMode !== 'static',
      autoRotateSpeed,
      targetPhi: targetAngles?.targetPhi ?? null,
      targetTheta: targetAngles?.targetTheta ?? null,
      onRender: () => {},
    };
  }, [cobeMarkers, targetAngles, isAutoRotate, motionMode, autoRotateSpeed]);

  // Fallback view if WebGL is unsupported
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
    <div className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col justify-center items-center">
      {/* Background Stage Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Header Signal Badge */}
      <div className="absolute top-4 left-6 z-20 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-full px-3 py-1 text-[11px] font-semibold text-slate-300 shadow-md pointer-events-auto">
        <Globe2 className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
        <span>ORBITAL SIGNAL FIELD MANUAL</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
      </div>

      {/* 21st Cobe Globe Stage */}
      <div className="relative w-full max-w-[650px] aspect-square flex items-center justify-center">
        <Globe className="w-full h-full" config={globeConfig} />
      </div>

      {/* Interactive Country Target Selector Chips */}
      <div className="absolute bottom-16 left-6 right-6 z-20 flex flex-wrap justify-center gap-1.5 max-w-4xl mx-auto pointer-events-auto">
        {points.map((pt) => {
          const isSelected = selectedCountryCode === pt.countryCode;
          const isHovered = activeHoverPoint === pt.countryCode;
          const bandClass =
            pt.topOpportunityBand === 'green'
              ? 'border-emerald-500/60 text-emerald-400 bg-emerald-950/40'
              : pt.topOpportunityBand === 'red'
              ? 'border-rose-500/60 text-rose-400 bg-rose-950/40'
              : 'border-amber-500/60 text-amber-400 bg-amber-950/40';

          return (
            <button
              key={pt.countryCode}
              onClick={() => onSelectCountry(pt.countryCode)}
              onMouseEnter={() => setActiveHoverPoint(pt.countryCode)}
              onMouseLeave={() => setActiveHoverPoint(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center space-x-1.5 backdrop-blur-sm ${
                isSelected
                  ? 'bg-sky-600 border-sky-400 text-white shadow-lg ring-2 ring-sky-500/50 scale-105'
                  : isHovered
                  ? 'bg-slate-800 border-slate-600 text-slate-100 scale-102'
                  : 'bg-slate-900/80 border-slate-800/80 text-slate-300 hover:border-slate-700'
              }`}
            >
              <MapPin className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-sky-400'}`} />
              <span>{pt.countryName}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${bandClass}`}>
                {pt.signalCount}
              </span>
            </button>
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
