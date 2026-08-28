import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GlobeMarkers } from './GlobeMarkers';
import { OpportunityMapPoint } from '@/src/types/mapTypes';
import { latLngToVector3, getCountryCoordinates } from '@/src/utils/geoUtils';
import { createContinentLines } from '@/src/utils/landData';
import { MotionMode, MOTION_CONFIG } from './motionConfig';

interface GlobeCanvasProps {
  points: OpportunityMapPoint[];
  selectedCountryCode: string | null;
  onSelectCountry: (code: string) => void;
  onResetView: () => void;
  isAutoRotate: boolean;
  motionMode: MotionMode;
}

export const GlobeCanvas: React.FC<GlobeCanvasProps> = ({
  points,
  selectedCountryCode,
  onSelectCountry,
  onResetView,
  isAutoRotate,
  motionMode,
}) => {
  return (
    <div className="w-full h-full relative bg-slate-950">
      <Canvas
        camera={{ position: [0, 0, 5.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#020617'), 1);
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <pointLight position={[-10, -10, -5]} intensity={0.4} color="#38bdf8" />

        {/* Deep space starfield background */}
        <Stars radius={100} depth={50} count={1200} factor={4} saturation={0} fade speed={0.5} />

        <EarthScene
          points={points}
          selectedCountryCode={selectedCountryCode}
          onSelectCountry={onSelectCountry}
          onResetView={onResetView}
          isAutoRotate={isAutoRotate}
          motionMode={motionMode}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3.2}
          maxDistance={8.0}
          rotateSpeed={0.6}
          zoomSpeed={0.8}
        />
      </Canvas>
    </div>
  );
};

interface EarthSceneProps {
  points: OpportunityMapPoint[];
  selectedCountryCode: string | null;
  onSelectCountry: (code: string) => void;
  onResetView: () => void;
  isAutoRotate: boolean;
  motionMode: MotionMode;
}

const EarthScene: React.FC<EarthSceneProps> = ({
  points,
  selectedCountryCode,
  onSelectCountry,
  onResetView,
  isAutoRotate,
  motionMode,
}) => {
  const globeGroupRef = useRef<THREE.Group>(null);
  const targetRotationRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Continent Line Geometries
  const continentLinesGroup = useMemo(() => {
    return createContinentLines(2.01, '#38bdf8', 0.4);
  }, []);

  // Selected Country Halo position
  const selectedHaloPosition = useMemo(() => {
    if (!selectedCountryCode) return null;
    const geo = getCountryCoordinates(selectedCountryCode);
    return latLngToVector3(geo.lat, geo.lng, 2.03);
  }, [selectedCountryCode]);

  // Handle camera / globe rotation to selected country
  useEffect(() => {
    if (selectedCountryCode) {
      const geo = getCountryCoordinates(selectedCountryCode);
      const targetPhi = (90 - geo.lat) * (Math.PI / 180);
      const targetTheta = (geo.lng + 180) * (Math.PI / 180);

      const targetX = targetPhi - Math.PI / 2;
      const targetY = -targetTheta + Math.PI;

      targetRotationRef.current = { x: targetX, y: targetY };

      if (motionMode === 'static' && globeGroupRef.current) {
        // Immediate focus without animation in static mode
        globeGroupRef.current.rotation.x = targetX;
        globeGroupRef.current.rotation.y = targetY;
      }
    } else {
      targetRotationRef.current = { x: 0, y: 0 };
    }
  }, [selectedCountryCode, motionMode]);

  // Frame loop for auto-rotation and smooth transition easing
  useFrame((state, delta) => {
    if (!globeGroupRef.current) return;

    if (selectedCountryCode) {
      if (motionMode !== 'static') {
        // Smooth interpolation towards target country coordinates (550-800ms)
        globeGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          globeGroupRef.current.rotation.x,
          targetRotationRef.current.x,
          delta * 4
        );
        globeGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          globeGroupRef.current.rotation.y,
          targetRotationRef.current.y,
          delta * 4
        );
      }
    } else if (isAutoRotate && motionMode === 'full') {
      // Gentle idle auto-rotation (4-8 deg/min ~ 0.0017 rad/frame approx)
      globeGroupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group ref={globeGroupRef}>
      {/* Dark Core Earth Sphere */}
      <mesh>
        <sphereGeometry args={[2.0, 64, 64]} />
        <meshStandardMaterial
          color="#0b1329"
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Lat-Lng Wireframe Grid Overlay */}
      <mesh>
        <sphereGeometry args={[2.005, 36, 18]} />
        <meshBasicMaterial
          color="#1e3a8a"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Continent Outlines Layer */}
      <primitive object={continentLinesGroup} />

      {/* Selected Country Focus Halo */}
      {selectedHaloPosition && (
        <group position={selectedHaloPosition}>
          <mesh>
            <ringGeometry args={[0.12, 0.18, 32]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* Faint Outer Atmospheric Glow Rim */}
      <mesh>
        <sphereGeometry args={[2.12, 32, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 3D Opportunity Map Markers */}
      <GlobeMarkers
        points={points}
        selectedCountryCode={selectedCountryCode}
        onSelectCountry={onSelectCountry}
        motionMode={motionMode}
      />
    </group>
  );
};
