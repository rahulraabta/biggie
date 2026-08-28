import test from 'node:test';
import assert from 'node:assert/strict';
import { getCountryCoordinates, latLngToVector3, getBandMetadata } from '../src/utils/geoUtils.js';
import { CONTINENT_OUTLINES, createContinentLines } from '../src/utils/landData.js';

test('getCountryCoordinates - retrieves correct lat/lng for known countries', () => {
  const india = getCountryCoordinates('IN');
  assert.equal(india.name, 'India');
  assert.ok(india.lat > 0);
  assert.ok(india.lng > 0);

  const us = getCountryCoordinates('US');
  assert.equal(us.name, 'United States');
  assert.ok(us.lat > 0);
  assert.ok(us.lng < 0);
});

test('getCountryCoordinates - provides fallback for unknown country code', () => {
  const unknown = getCountryCoordinates('XYZ');
  assert.equal(unknown.name, 'XYZ');
  assert.equal(unknown.lat, 20.0);
  assert.equal(unknown.lng, 0.0);
});

test('latLngToVector3 - converts spherical coordinates to Cartesian vector', () => {
  const [x, y, z] = latLngToVector3(0, 0, 2);
  assert.ok(typeof x === 'number');
  assert.ok(typeof y === 'number');
  assert.ok(typeof z === 'number');
  // At 0 lat, 0 lng, y should be approximately 0
  assert.ok(Math.abs(y) < 0.01);

  // Check radius magnitude on vector
  const mag = Math.sqrt(x * x + y * y + z * z);
  assert.ok(Math.abs(mag - 2) < 0.001);
});

test('latLngToVector3 - handles North & South poles correctly', () => {
  const [nx, ny, nz] = latLngToVector3(90, 0, 2);
  assert.ok(Math.abs(ny - 2) < 0.001);

  const [sx, sy, sz] = latLngToVector3(-90, 0, 2);
  assert.ok(Math.abs(sy - (-2)) < 0.001);
});

test('createContinentLines - generates 3D line loops for continent outlines', () => {
  assert.ok(CONTINENT_OUTLINES.length >= 7);
  const group = createContinentLines(2.01);
  assert.equal(group.children.length, CONTINENT_OUTLINES.length);
});

test('getBandMetadata - maps viability bands to labels and styles', () => {
  const green = getBandMetadata('green');
  assert.equal(green.label, 'High Viability');
  assert.equal(green.colorHex, '#10b981');

  const orange = getBandMetadata('orange');
  assert.equal(orange.label, 'Medium Viability');

  const red = getBandMetadata('red');
  assert.equal(red.label, 'Low Viability');
});
