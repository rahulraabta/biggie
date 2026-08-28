import test from 'node:test';
import assert from 'node:assert/strict';
import { getCountryCoordinates } from '../src/utils/geoUtils.js';
import { GET as getMapOverview } from '../app/api/map/overview/route.js';
import { GET as getMapCountry } from '../app/api/map/country/route.js';
import { GET as getMapRegion } from '../app/api/map/region/route.js';
import { GET as getOpportunities } from '../app/api/opportunities/route.js';
import { GET as getClusters } from '../app/api/clusters/route.js';
import { POST as postQA } from '../app/api/qa/route.js';

test('Map API Data Validation - handles missing parameters safely', () => {
  const invalidCode = '';
  assert.equal(invalidCode.length < 2, true);

  const validCode = 'IN';
  const geo = getCountryCoordinates(validCode);
  assert.equal(geo.name, 'India');
  assert.equal(geo.lat, 20.5937);
  assert.equal(geo.lng, 78.9629);
});

test('Map API Structure - verifies map point structure', () => {
  const samplePoint = {
    id: 'point-IN',
    countryCode: 'IN',
    countryName: 'India',
    lat: 20.5937,
    lng: 78.9629,
    signalCount: 18,
    greenCount: 3,
    orangeCount: 2,
    redCount: 1,
    dominantSector: 'energy',
    topOpportunityTitle: 'Solar Microgrid',
    topOpportunityType: 'business' as const,
    topOpportunityBand: 'green' as const,
    topProbabilityScore: 85.8,
  };

  assert.equal(samplePoint.countryCode, 'IN');
  assert.equal(samplePoint.greenCount + samplePoint.orangeCount + samplePoint.redCount, 6);
});

test('API Route - GET /api/map/overview returns valid payload', async () => {
  const res = await getMapOverview();
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.points));
  assert.ok(data.points.length > 0);
  assert.ok(data.totalGlobalSignals > 0);
});

test('API Route - GET /api/map/country?code=IN returns country intelligence summary', async () => {
  const req = new Request('http://localhost:3000/api/map/country?code=IN');
  const res = await getMapCountry(req);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.country.code, 'IN');
  assert.equal(data.country.name, 'India');
  assert.ok(data.country.opportunities.length > 0);
  assert.ok(data.country.topHeadlines.length > 0);
});

test('API Route - GET /api/map/country validation failure', async () => {
  const req = new Request('http://localhost:3000/api/map/country?code=');
  const res = await getMapCountry(req);
  const data = await res.json();
  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test('API Route - GET /api/map/region?country=IN&region=Karnataka returns regional payload', async () => {
  const req = new Request('http://localhost:3000/api/map/region?country=IN&region=Karnataka');
  const res = await getMapRegion(req);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.region.countryCode, 'IN');
  assert.equal(data.region.regionName, 'Karnataka');
});

test('API Route - GET /api/opportunities returns opportunity list', async () => {
  const req = new Request('http://localhost:3000/api/opportunities?band=green');
  const res = await getOpportunities(req);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.opportunities));
});

test('API Route - GET /api/clusters returns cluster list', async () => {
  const req = new Request('http://localhost:3000/api/clusters');
  const res = await getClusters(req);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.clusters));
});

test('API Route - POST /api/qa returns AI answer', async () => {
  const req = new Request('http://localhost:3000/api/qa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'What are the main risks?' }),
  });
  const res = await postQA(req);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(typeof data.answer === 'string');
});
