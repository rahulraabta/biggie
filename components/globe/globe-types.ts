import { OpportunityMapPoint } from '@/src/types/mapTypes';
import { MotionMode } from './motionConfig';

export interface CameraTargetState {
  lat: number;
  lng: number;
  distance: number;
  countryCode?: string;
  regionName?: string;
  marketId?: string;
}

/**
 * Focus-lock target: when set, the globe tweens this lat/lng to face the
 * camera (with a gentle zoom-in) and a radial ping rings the spot.
 */
export interface GlobeFocusTarget {
  lat: number;
  lng: number;
}

export interface GlobeProps {
  points: OpportunityMapPoint[];
  selectedCountryCode: string | null;
  selectedRegionName: string | null;
  selectedMarketId?: string | null;
  onSelectCountry: (countryCode: string) => void;
  onSelectRegion?: (countryCode: string, regionName: string) => void;
  onSelectMarket?: (marketId: string) => void;
  onResetView: () => void;
  isAutoRotate: boolean;
  onToggleAutoRotate: () => void;
  motionMode: MotionMode;
  onMotionModeChange: (mode: MotionMode) => void;
  globeImageUrl?: string;
  bumpImageUrl?: string;
  /** Opportunity dossiers rendered as interactive pins on the globe */
  opportunities?: GlobeOpportunityPinDatum[];
  /** Opens the OpportunityDetailDrawer for a clicked dossier pin */
  onSelectOpportunity?: (id: number) => void;
  /** Camera focus lock — non-null while a dossier is selected */
  focusTarget?: GlobeFocusTarget | null;
}

/**
 * Minimal per-opportunity fields the globe pins need from the API item.
 * Kept separate from OpportunityResponseItem so the globe layer never
 * imports from the API route.
 */
export interface GlobeOpportunityPinDatum {
  id: number;
  title: string;
  dominant_sector?: string;
  band: 'red' | 'orange' | 'green';
  probability_score: number;
  latitude?: number;
  longitude?: number;
  goldstein_delta?: number;
}
