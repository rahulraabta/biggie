import { GeoLocation } from '../types/mapTypes';

export interface CountryGeoData {
  name: string;
  lat: number;
  lng: number;
}

export const COUNTRY_COORDINATES: Record<string, CountryGeoData> = {
  IN: { name: 'India', lat: 20.5937, lng: 78.9629 },
  US: { name: 'United States', lat: 37.0902, lng: -95.7129 },
  GB: { name: 'United Kingdom', lat: 55.3781, lng: -3.436 },
  SG: { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  AE: { name: 'United Arab Emirates', lat: 23.4241, lng: 53.8478 },
  DE: { name: 'Germany', lat: 51.1657, lng: 10.4515 },
  JP: { name: 'Japan', lat: 36.2048, lng: 138.2529 },
  CN: { name: 'China', lat: 35.8617, lng: 104.1954 },
  BR: { name: 'Brazil', lat: -14.235, lng: -51.9253 },
  FR: { name: 'France', lat: 46.2276, lng: 2.2137 },
  AU: { name: 'Australia', lat: -25.2744, lng: 133.7751 },
  CA: { name: 'Canada', lat: 56.1304, lng: -106.3468 },
  KR: { name: 'South Korea', lat: 35.9078, lng: 127.7669 },
  ZA: { name: 'South Africa', lat: -30.5595, lng: 22.9375 },
  MX: { name: 'Mexico', lat: 23.6345, lng: -102.5528 },
  ES: { name: 'Spain', lat: 40.4637, lng: -3.7492 },
  IT: { name: 'Italy', lat: 41.8719, lng: 12.5674 },
  NL: { name: 'Netherlands', lat: 52.1326, lng: 5.2913 },
  SE: { name: 'Sweden', lat: 60.1282, lng: 18.6435 },
  CH: { name: 'Switzerland', lat: 46.8182, lng: 8.2275 },
  EU: { name: 'European Union', lat: 50.8503, lng: 4.3517 },
  GLOBAL: { name: 'Global Markets', lat: 25.0, lng: 10.0 },
};

export function getCountryCoordinates(code: string): CountryGeoData {
  const normalized = (code || 'GLOBAL').toUpperCase();
  return COUNTRY_COORDINATES[normalized] || {
    name: code || 'Unknown Region',
    lat: 20.0,
    lng: 0.0,
  };
}

/**
 * Converts Latitude & Longitude to 3D Cartesian Vector3 coordinates on a sphere of radius R.
 * Note: Three.js Y-axis is up, Z-axis points towards camera.
 */
export function latLngToVector3(lat: number, lng: number, radius = 2): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return [x, y, z];
}

/**
 * Maps probability score to text label & hex color.
 */
export function getBandMetadata(band: 'red' | 'orange' | 'green'): {
  label: string;
  colorHex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (band) {
    case 'green':
      return {
        label: 'High Viability',
        colorHex: '#10b981',
        bgClass: 'bg-emerald-950/60',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-700/60',
      };
    case 'orange':
      return {
        label: 'Medium Viability',
        colorHex: '#f59e0b',
        bgClass: 'bg-amber-950/60',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-700/60',
      };
    case 'red':
      return {
        label: 'Low Viability',
        colorHex: '#f43f5e',
        bgClass: 'bg-rose-950/60',
        textClass: 'text-rose-400',
        borderClass: 'border-rose-700/60',
      };
  }
}
