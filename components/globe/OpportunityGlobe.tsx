'use client';

import React, { useState, useEffect } from 'react';
import { GlobeProps } from './globe-types';
import { OpportunityEarthGlobeAdapter } from './OpportunityEarthGlobeAdapter';
import { WorldFallback } from '../map/WorldFallback';

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
  globeImageUrl = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
  bumpImageUrl = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
  opportunities,
  onSelectOpportunity,
  focusTarget,
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
    <OpportunityEarthGlobeAdapter
      points={points}
      selectedCountryCode={selectedCountryCode}
      selectedRegionName={selectedRegionName}
      selectedMarketId={selectedMarketId}
      onSelectCountry={onSelectCountry}
      onResetView={onResetView}
      isAutoRotate={isAutoRotate}
      onToggleAutoRotate={onToggleAutoRotate}
      motionMode={motionMode}
      onMotionModeChange={onMotionModeChange}
      globeImageUrl={globeImageUrl}
      bumpImageUrl={bumpImageUrl}
      opportunities={opportunities}
      onSelectOpportunity={onSelectOpportunity}
      focusTarget={focusTarget}
    />
  );
};
