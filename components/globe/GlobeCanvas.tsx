import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { GlobeMarkers } from './GlobeMarkers';
import { GlobeOpportunityPins, GlobeOpportunityPin } from './GlobeOpportunityPins';
import { OpportunityMapPoint } from '@/src/types/mapTypes';
import { latLngToVector3, getPinCoordinates, latLngToGlobeRotation, shortestArcTo } from '@/src/utils/geoUtils';
import { createContinentLines } from '@/src/utils/landData';
import { MotionMode, MOTION_CONFIG } from './motionConfig';
import { GlobeFocusTarget } from './globe-types';

interface GlobeCanvasProps {
  points: OpportunityMapPoint[];
  selectedCountryCode: string | null;
  onSelectCountry: (code: string) => void;
  onResetView: () => void;
  isAutoRotate: boolean;
  motionMode: MotionMode;
  globeImageUrl?: string;
  bumpImageUrl?: string;
  opportunityPins?: GlobeOpportunityPin[];
  onSelectOpportunity?: (id: number) => void;
  focusTarget?: GlobeFocusTarget | null;
}

/** Camera distance the focus lock eases in to (default orbit is 8, min zoom 3.2). */
const FOCUS_CAMERA_DISTANCE = 5.2;
/** Default orbit distance — the symmetric ease-out returns to this. */
const DEFAULT_CAMERA_DISTANCE = 8.0;
const FOCUS_RING_COLOR = '#34d399';

/**
 * Radial ping at the focus-locked coordinates: two phase-offset rings pulse
 * outward from a bright core dot. Frame cost is two scalar scales and two
 * opacity writes — negligible against the 60fps budget.
 */
const FocusPingRings: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const groupRef = useRef<THREE.Group>(null);
  const position = useMemo(() => latLngToVector3(lat, lng, 2.02), [lat, lng]);

  // Orient the ring plane tangent to the sphere surface (normal along the radius)
  useEffect(() => {
    groupRef.current?.lookAt(0, 0, 0);
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry.type !== 'RingGeometry') return;
      const phase = (t * 0.7 + i * 0.5) % 1;
      mesh.scale.setScalar(1 + phase * 2.4);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.65 * (1 - phase);
    });
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <circleGeometry args={[0.035, 24]} />
        <meshBasicMaterial color={FOCUS_RING_COLOR} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshBasicMaterial color={FOCUS_RING_COLOR} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshBasicMaterial color={FOCUS_RING_COLOR} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const GlobeCanvas: React.FC<GlobeCanvasProps> = ({
  points,
  selectedCountryCode,
  onSelectCountry,
  onResetView,
  isAutoRotate,
  motionMode,
  globeImageUrl = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
  bumpImageUrl = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
  opportunityPins = [],
  onSelectOpportunity,
  focusTarget = null,
}) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(new THREE.Color('#000000'), 1);
          // Pin the view dead-center on the globe — no vertical/horizontal offsets
          camera.lookAt(0, 0, 0);
        }}
      >
        <ambientLight intensity={1.0} color="#ffffff" />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={0.8} color="#ffffff" />

        {/* Deep space starfield background — Blue Marble pops against pure black */}
        <Stars radius={100} depth={50} count={1800} factor={4} saturation={0} fade speed={0.5} />

        <Suspense fallback={null}>
          <EarthScene
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
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          target={[0, 0, 0]}
          minDistance={3.2}
          maxDistance={12}
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
  globeImageUrl?: string;
  bumpImageUrl?: string;
  opportunityPins?: GlobeOpportunityPin[];
  onSelectOpportunity?: (id: number) => void;
  focusTarget?: GlobeFocusTarget | null;
}

const EarthTexturedSphere: React.FC<{ globeImageUrl: string; bumpImageUrl: string }> = ({
  globeImageUrl,
  bumpImageUrl,
}) => {
  const [colorMap, bumpMap] = useTexture([globeImageUrl, bumpImageUrl]);

  return (
    <mesh>
      <sphereGeometry args={[2.0, 64, 64]} />
      <meshStandardMaterial
        color="#ffffff"
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.05}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
};

const EarthScene: React.FC<EarthSceneProps> = ({
  points,
  selectedCountryCode,
  onSelectCountry,
  onResetView,
  isAutoRotate,
  motionMode,
  globeImageUrl = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
  bumpImageUrl = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
  opportunityPins = [],
  onSelectOpportunity,
  focusTarget = null,
}) => {
  const globeGroupRef = useRef<THREE.Group>(null);
  const targetRotationRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // True while the frame loop owns the camera distance (focus lock active or
  // its ease-out still settling) — keeps the zoom-out from permanently
  // overriding user scroll-zoom.
  const cameraManagedRef = useRef(false);

  // Continent Line Geometries
  const continentLinesGroup = useMemo(() => {
    return createContinentLines(2.01, '#38bdf8', 0.4);
  }, []);

  // Selected Country Halo position (capital anchor for priority markets, centroid otherwise)
  const selectedHaloPosition = useMemo(() => {
    if (!selectedCountryCode) return null;
    const geo = getPinCoordinates(selectedCountryCode);
    return latLngToVector3(geo.lat, geo.lng, 2.03);
  }, [selectedCountryCode]);

  // Handle camera / globe rotation to selected country. A dossier focus lock
  // wins over the country selection when both are active — the most recent
  // user intent is the selected opportunity, so the globe follows it.
  useEffect(() => {
    if (focusTarget) {
      targetRotationRef.current = latLngToGlobeRotation(focusTarget.lat, focusTarget.lng);
    } else if (selectedCountryCode) {
      const geo = getPinCoordinates(selectedCountryCode);
      targetRotationRef.current = latLngToGlobeRotation(geo.lat, geo.lng);
    } else {
      targetRotationRef.current = { x: 0, y: 0 };
    }

    if (motionMode === 'static' && globeGroupRef.current) {
      // Immediate focus without animation in static mode
      globeGroupRef.current.rotation.x = targetRotationRef.current.x;
      globeGroupRef.current.rotation.y = targetRotationRef.current.y;
    }
  }, [focusTarget, selectedCountryCode, motionMode]);

  // Frame loop for auto-rotation and smooth transition easing. Lerp
  // retargeting IS the tween-cancellation: a new focus just overwrites
  // targetRotationRef mid-flight and the easing redirects instantly — no
  // TWEEN instances to track or dispose.
  useFrame((state, delta) => {
    if (!globeGroupRef.current) return;

    // Symmetric camera zoom: ease in to the focus distance while locked,
    // ease back out to the default (8.0) on release. The zoom-out runs only
    // while `cameraManagedRef` is set — once it settles within ε of the
    // default, control hands back to OrbitControls so user scroll-zoom is
    // never fought when no dossier is open.
    if (motionMode !== 'static') {
      const camera = state.camera;
      const currentDistance = camera.position.length();
      if (focusTarget) {
        cameraManagedRef.current = true;
        const eased = THREE.MathUtils.lerp(currentDistance, FOCUS_CAMERA_DISTANCE, delta * 2);
        camera.position.setLength(eased);
      } else if (cameraManagedRef.current) {
        const eased = THREE.MathUtils.lerp(currentDistance, DEFAULT_CAMERA_DISTANCE, delta * 2);
        camera.position.setLength(eased);
        if (Math.abs(eased - DEFAULT_CAMERA_DISTANCE) < 0.05) {
          cameraManagedRef.current = false;
          camera.position.setLength(DEFAULT_CAMERA_DISTANCE);
        }
      }
    }

    if (focusTarget || selectedCountryCode) {
      if (motionMode !== 'static') {
        // Smooth interpolation towards the target (≈550-800ms at 4/delta).
        // rotation.y lerps along the shortest arc so the fly-to never spins the long way.
        globeGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          globeGroupRef.current.rotation.x,
          targetRotationRef.current.x,
          delta * 4
        );
        const targetY = shortestArcTo(
          globeGroupRef.current.rotation.y,
          targetRotationRef.current.y
        );
        globeGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          globeGroupRef.current.rotation.y,
          targetY,
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
      {/* High Quality Textured 3D Earth Core Sphere */}
      <EarthTexturedSphere globeImageUrl={globeImageUrl} bumpImageUrl={bumpImageUrl} />

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

      {/* Focus-Lock Radial Ping — rings pulse outward at the target coords */}
      {focusTarget && <FocusPingRings lat={focusTarget.lat} lng={focusTarget.lng} />}

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

      {/* Interactive Opportunity Dossier Pins (hover tooltip → click opens dossier drawer) */}
      {opportunityPins.length > 0 && onSelectOpportunity && (
        <GlobeOpportunityPins pins={opportunityPins} onSelectOpportunity={onSelectOpportunity} />
      )}
    </group>
  );
};
