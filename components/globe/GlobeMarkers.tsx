import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { OpportunityMapPoint } from '@/src/types/mapTypes';
import { latLngToVector3, getBandMetadata } from '@/src/utils/geoUtils';
import { MotionMode, MOTION_CONFIG } from './motionConfig';

interface GlobeMarkersProps {
  points: OpportunityMapPoint[];
  selectedCountryCode: string | null;
  onSelectCountry: (code: string) => void;
  motionMode: MotionMode;
}

export const GlobeMarkers: React.FC<GlobeMarkersProps> = ({
  points,
  selectedCountryCode,
  onSelectCountry,
  motionMode,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<OpportunityMapPoint | null>(null);

  // Determine top momentum green points that are allowed to pulse (max 4)
  const pulsingPointIds = useMemo(() => {
    if (motionMode !== 'full') return new Set<string | number>();
    const greenPoints = points
      .filter((p) => p.topOpportunityBand === 'green')
      .sort((a, b) => b.topProbabilityScore - a.topProbabilityScore)
      .slice(0, MOTION_CONFIG.maxPulsingNodes);
    return new Set(greenPoints.map((p) => p.id));
  }, [points, motionMode]);

  return (
    <group>
      {points.map((point) => (
        <MarkerNode
          key={point.id}
          point={point}
          isSelected={selectedCountryCode === point.countryCode}
          isHovered={hoveredPoint?.id === point.id}
          shouldPulse={pulsingPointIds.has(point.id)}
          onHover={() => setHoveredPoint(point)}
          onUnhover={() => setHoveredPoint(null)}
          onSelect={() => onSelectCountry(point.countryCode)}
          motionMode={motionMode}
        />
      ))}

      {/* Hover Tooltip Overlay */}
      {hoveredPoint && (
        <Html
          position={latLngToVector3(hoveredPoint.lat, hoveredPoint.lng, 2.25)}
          center
          distanceFactor={6}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs text-slate-100 min-w-[200px] z-50">
            <div className="flex items-center justify-between font-bold text-slate-100 border-b border-slate-800 pb-1.5 mb-1.5">
              <span>{hoveredPoint.countryName} ({hoveredPoint.countryCode})</span>
              <span className="text-[10px] text-sky-400">{hoveredPoint.signalCount} Signals</span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium line-clamp-2 mb-2">
              {hoveredPoint.topOpportunityTitle}
            </p>
            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80 text-slate-400">
              <span>Top Sector: <strong className="text-slate-200 uppercase">{hoveredPoint.dominantSector}</strong></span>
              <span className="text-emerald-400 font-bold">{hoveredPoint.topProbabilityScore}%</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

interface MarkerNodeProps {
  point: OpportunityMapPoint;
  isSelected: boolean;
  isHovered: boolean;
  shouldPulse: boolean;
  onHover: () => void;
  onUnhover: () => void;
  onSelect: () => void;
  motionMode: MotionMode;
}

const MarkerNode: React.FC<MarkerNodeProps> = ({
  point,
  isSelected,
  isHovered,
  shouldPulse,
  onHover,
  onUnhover,
  onSelect,
  motionMode,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const [x, y, z] = latLngToVector3(point.lat, point.lng, 2.02);
  const bandMeta = getBandMetadata(point.topOpportunityBand);
  const baseColor = new THREE.Color(bandMeta.colorHex);

  // Size scale based on signal count density
  const nodeRadius = Math.max(0.035, Math.min(0.08, 0.03 + point.signalCount * 0.002));

  // Pulse animation frame loop (only for top capped green nodes in full motion mode)
  useFrame(({ clock }) => {
    if (ringRef.current && shouldPulse && motionMode === 'full') {
      const t = (clock.getElapsedTime() * 1.5) % 1;
      ringRef.current.scale.set(1 + t * 1.1, 1 + t * 1.1, 1 + t * 1.1);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 * (1 - t));
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Central Node Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover();
        }}
        onPointerOut={() => onUnhover()}
      >
        <sphereGeometry args={[isSelected ? nodeRadius * 1.4 : isHovered ? nodeRadius * 1.2 : nodeRadius, 16, 16]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isSelected ? 1.2 : isHovered ? 0.9 : 0.5}
          roughness={0.2}
        />
      </mesh>

      {/* Signal Ring (Pulsing in Full Motion mode, Static indicator in Reduced/Static mode) */}
      {point.topOpportunityBand === 'green' && (
        <mesh ref={ringRef}>
          <ringGeometry args={[nodeRadius * 1.1, nodeRadius * 1.3, 32]} />
          <meshBasicMaterial
            color={baseColor}
            transparent
            opacity={shouldPulse && motionMode === 'full' ? 0.5 : 0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};
