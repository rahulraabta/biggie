import * as THREE from 'three';
import { latLngToVector3 } from './geoUtils';

// Simplified continent boundary polygons (Latitude, Longitude coordinates)
export const CONTINENT_OUTLINES: Array<Array<[number, number]>> = [
  // North America
  [
    [70, -160], [70, -100], [60, -60], [45, -60], [30, -80],
    [25, -80], [15, -90], [10, -80], [8, -78], [15, -105],
    [32, -117], [48, -125], [60, -140], [70, -160]
  ],
  // South America
  [
    [10, -75], [5, -50], [-10, -35], [-22, -40], [-35, -55],
    [-55, -68], [-50, -75], [-18, -70], [0, -80], [10, -75]
  ],
  // Europe
  [
    [70, -10], [70, 30], [60, 40], [45, 35], [36, 28],
    [36, -5], [44, -9], [50, -2], [58, 5], [62, 5], [70, -10]
  ],
  // Africa
  [
    [35, -6], [37, 10], [31, 32], [12, 43], [0, 42],
    [-12, 40], [-34, 26], [-34, 18], [5, 10], [15, -17],
    [28, -13], [35, -6]
  ],
  // Asia
  [
    [75, 60], [75, 170], [60, 160], [40, 140], [30, 120],
    [22, 114], [10, 105], [8, 77], [25, 62], [30, 48],
    [40, 50], [55, 60], [75, 60]
  ],
  // Australia / Oceania
  [
    [-12, 130], [-15, 145], [-25, 153], [-38, 148], [-32, 115],
    [-22, 114], [-12, 130]
  ],
  // Greenland
  [
    [82, -40], [82, -20], [70, -20], [60, -45], [75, -60], [82, -40]
  ],
  // Antarctica
  [
    [-65, 0], [-65, 90], [-65, 180], [-65, -90], [-65, 0]
  ]
];

/**
 * Builds Three.js LineLoop objects for continent boundary wireframes on a sphere of radius R.
 */
export function createContinentLines(radius = 2.01, color = '#38bdf8', opacity = 0.35): THREE.Group {
  const group = new THREE.Group();

  CONTINENT_OUTLINES.forEach((outline) => {
    const points: THREE.Vector3[] = outline.map(([lat, lng]) => {
      const [x, y, z] = latLngToVector3(lat, lng, radius);
      return new THREE.Vector3(x, y, z);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      linewidth: 1,
    });

    const lineLoop = new THREE.LineLoop(geometry, material);
    group.add(lineLoop);
  });

  return group;
}
