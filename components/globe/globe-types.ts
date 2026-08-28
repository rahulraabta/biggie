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
}
