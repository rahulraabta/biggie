export type MotionMode = 'full' | 'reduced' | 'static';

export interface MotionTimingConfig {
  idleRotationSpeedRadSec: number; // 4-8 degrees/minute (~0.00116 to 0.00233 rad/sec)
  idleResumeDelayMs: number; // 3-5 seconds of genuine inactivity before auto-rotate resumes
  countryFocusDurationMs: number; // 550-800 ms smooth camera transition
  countryPanelCrossfadeMs: number; // 180-260 ms
  regionFocusDurationMs: number; // 300-500 ms camera approach
  cardStaggerDelayMs: number; // 40-70 ms per item
  maxCardStaggerTotalMs: number; // Capped < 350 ms
  cardHoverScale: number; // 1.01 - 1.02
  drawerDurationMs: number; // 220-320 ms
  maxPulsingNodes: number; // Capped max 3-5 high-momentum green nodes
}

export const MOTION_CONFIG: MotionTimingConfig = {
  idleRotationSpeedRadSec: 0.0017, // ~6 degrees per minute
  idleResumeDelayMs: 4000, // 4 seconds inactivity resume
  countryFocusDurationMs: 650,
  countryPanelCrossfadeMs: 220,
  regionFocusDurationMs: 400,
  cardStaggerDelayMs: 50,
  maxCardStaggerTotalMs: 300,
  cardHoverScale: 1.015,
  drawerDurationMs: 260,
  maxPulsingNodes: 4,
};

export const MOTION_MODE_KEY = 'opportunity_earth_motion_mode';

export function getSystemPreferredMotionMode(): MotionMode {
  if (typeof window === 'undefined') return 'full';

  try {
    const saved = localStorage.getItem(MOTION_MODE_KEY);
    if (saved === 'full' || saved === 'reduced' || saved === 'static') {
      return saved;
    }
  } catch {
    // Ignore localStorage errors
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'reduced';
  }

  return 'full';
}

export function saveMotionModePreference(mode: MotionMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MOTION_MODE_KEY, mode);
  } catch {
    // Ignore localStorage errors
  }
}

export const MOTION_MODE_LABELS: Record<MotionMode, { title: string; description: string }> = {
  full: {
    title: 'Full Motion',
    description: 'Smooth 3D camera transitions, idle rotation, and signal ring pulses.',
  },
  reduced: {
    title: 'Reduced Motion',
    description: 'Low-frequency animations with idle rotation and camera scaling disabled.',
  },
  static: {
    title: 'Static Mode',
    description: 'Immediate transitions with zero background rotation or pulsing rings.',
  },
};

/**
 * Maps vertical scroll progress (0.0 to 1.0) to subtle globe rotation (10 to 20 degrees).
 */
export function calculateScrollRotationRad(scrollProgress: number, maxDeg = 15): number {
  const boundedProgress = Math.max(0, Math.min(1, scrollProgress));
  const deg = boundedProgress * maxDeg;
  return deg * (Math.PI / 180);
}
