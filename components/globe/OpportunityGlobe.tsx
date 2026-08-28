'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GlobeProps } from './globe-types';
import { GlobeControls } from './GlobeControls';
import { WorldFallback } from '../map/WorldFallback';
import { GlobeErrorBoundary } from './GlobeErrorBoundary';
import { RefreshCw } from 'lucide-react';

// SSR-disabled dynamic import of 3D Canvas
const DynamicGlobeCanvas = dynamic(
  () => import('./GlobeCanvas').then((mod) => mod.GlobeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-300">Initializing 3D Opportunity Earth Grid...</p>
      </div>
    ),
  }
);

export const OpportunityGlobe: React.FC<GlobeProps> = ({
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

  // Use accessible 2D fallback view if WebGL is unsupported
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
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      {/* 3D WebGL Globe Canvas wrapped in Error Boundary */}
      <GlobeErrorBoundary
        points={points}
        selectedCountryCode={selectedCountryCode}
        onSelectCountry={onSelectCountry}
        onResetView={onResetView}
      >
        <DynamicGlobeCanvas
          points={points}
          selectedCountryCode={selectedCountryCode}
          onSelectCountry={onSelectCountry}
          onResetView={onResetView}
          isAutoRotate={isAutoRotate}
          motionMode={motionMode}
        />
      </GlobeErrorBoundary>

      {/* Floating Controls & Legend Overlay */}
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
