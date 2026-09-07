import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import { latLngToVector3 } from '@/src/utils/geoUtils';

/**
 * A single opportunity dossier pin as rendered on the 3D Earth.
 * Mirrors the fields consumed by the globe pins + tooltip.
 */
export interface GlobeOpportunityPin {
  id: number;
  title: string;
  sector: string;
  band: 'red' | 'orange' | 'green';
  latitude: number;
  longitude: number;
  goldsteinDelta?: number;
  probabilityScore?: number;
}

interface GlobeOpportunityPinsProps {
  pins: GlobeOpportunityPin[];
  onSelectOpportunity: (id: number) => void;
}

const BAND_COLORS: Record<GlobeOpportunityPin['band'], string> = {
  green: '#10b981',
  orange: '#f59e0b',
  red: '#ef4444',
};

const PIN_RADIUS = 0.06;
const PIN_ALTITUDE = 2.06; // just above the marker layer (2.02) so pins hit-test first

export const GlobeOpportunityPins: React.FC<GlobeOpportunityPinsProps> = ({
  pins,
  onSelectOpportunity,
}) => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const hovered = pins.find((p) => p.id === hoveredId) || null;

  return (
    <group>
      {pins.map((pin) => (
        <OpportunityPinNode
          key={pin.id}
          pin={pin}
          isHovered={hoveredId === pin.id}
          onHover={() => setHoveredId(pin.id)}
          onUnhover={() => setHoveredId(null)}
          onSelect={() => onSelectOpportunity(pin.id)}
        />
      ))}

      {/* Hover Tooltip — compact glassmorphism dossier card (Title, Sector, Goldstein delta) */}
      {hovered && (
        <Html
          position={latLngToVector3(hovered.latitude, hovered.longitude, 2.3)}
          center
          distanceFactor={6}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-slate-950/85 backdrop-blur-md border border-emerald-500/30 rounded-xl px-3.5 py-2.5 shadow-2xl text-xs text-slate-100 min-w-[210px] max-w-[260px]">
            <p className="font-extrabold text-slate-100 leading-snug line-clamp-2 mb-1.5">
              {hovered.title}
            </p>
            <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-white/10 text-slate-400">
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: BAND_COLORS[hovered.band] }}
                />
                <span className="uppercase tracking-wide">{hovered.sector}</span>
              </span>
              <span className="flex items-center gap-1">
                <span>Goldstein</span>
                <span
                  className={`font-bold tabular-nums ${
                    (hovered.goldsteinDelta ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {hovered.goldsteinDelta !== undefined
                    ? hovered.goldsteinDelta >= 0
                      ? `+${hovered.goldsteinDelta.toFixed(1)}`
                      : hovered.goldsteinDelta.toFixed(1)
                    : '—'}
                </span>
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

interface OpportunityPinNodeProps {
  pin: GlobeOpportunityPin;
  isHovered: boolean;
  onHover: () => void;
  onUnhover: () => void;
  onSelect: () => void;
}

const OpportunityPinNode: React.FC<OpportunityPinNodeProps> = ({
  pin,
  isHovered,
  onHover,
  onUnhover,
  onSelect,
}) => {
  const [x, y, z] = latLngToVector3(pin.latitude, pin.longitude, PIN_ALTITUDE);
  const color = BAND_COLORS[pin.band];

  return (
    <group position={[x, y, z]}>
      {/* Clickable pin sphere — dossier entry point */}
      <mesh
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
        <sphereGeometry args={[isHovered ? PIN_RADIUS * 1.5 : PIN_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 1.4 : 0.8}
          roughness={0.25}
        />
      </mesh>

      {/* Short stem anchoring the pin to the globe surface */}
      <mesh>
        <cylinderGeometry args={[PIN_RADIUS * 0.12, PIN_RADIUS * 0.12, 0.06, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </group>
  );
};
