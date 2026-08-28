import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOCUS_MARKETS,
  getFocusMarket,
  isAggregationMarket,
  getAllFocusMarkets,
  FocusMarketId,
} from '../src/config/focusMarkets.js';
import {
  MOTION_CONFIG,
  MOTION_MODE_KEY,
  calculateScrollRotationRad,
} from '../components/globe/motionConfig.js';

test('Focus Markets - verifies all 10 priority entries exist', () => {
  const expectedIds: FocusMarketId[] = [
    'IN',
    'US',
    'GB',
    'SG',
    'AE',
    'DE',
    'JP',
    'EU',
    'GLOBAL',
    'ROW',
  ];

  const markets = getAllFocusMarkets();
  assert.equal(markets.length, 10);

  expectedIds.forEach((id) => {
    const market = getFocusMarket(id);
    assert.ok(market, `Focus market ${id} should exist`);
    assert.equal(market?.id, id);
    assert.ok(market?.displayName.length > 0);
    assert.ok(market?.camera.distance > 0);
    assert.ok(market?.accessibilityLabel.length > 0);
  });
});

test('Focus Markets - verifies ISO codes are present ONLY for real countries', () => {
  const countryIds: FocusMarketId[] = ['IN', 'US', 'GB', 'SG', 'AE', 'DE', 'JP'];
  countryIds.forEach((id) => {
    const market = getFocusMarket(id);
    assert.equal(market?.kind, 'country');
    assert.equal(market?.isoCode, id);
  });

  const aggregationIds: FocusMarketId[] = ['EU', 'GLOBAL', 'ROW'];
  aggregationIds.forEach((id) => {
    const market = getFocusMarket(id);
    assert.equal(market?.kind, 'aggregation');
    assert.equal(market?.isoCode, undefined, `Aggregation market ${id} must not have ISO code`);
    assert.equal(isAggregationMarket(id), true);
  });
});

test('Focus Markets - verifies hotspots configuration where applicable', () => {
  const india = getFocusMarket('IN');
  assert.ok(india?.hotspots && india.hotspots.length >= 5);
  const blr = india?.hotspots?.find((h) => h.name === 'Bengaluru');
  assert.ok(blr);
  assert.equal(blr?.sector, 'technology');

  const globalMarket = getFocusMarket('GLOBAL');
  assert.equal(globalMarket?.hotspots, undefined);
});

test('Motion System Config - verifies centralized timings and scroll rotation limits', () => {
  assert.equal(MOTION_CONFIG.idleResumeDelayMs, 4000);
  assert.equal(MOTION_CONFIG.countryFocusDurationMs, 650);
  assert.equal(MOTION_CONFIG.maxPulsingNodes, 4);

  // Test scroll rotation translation to 10-20 degrees max
  const rotStart = calculateScrollRotationRad(0.0, 15);
  assert.equal(rotStart, 0);

  const rotMax = calculateScrollRotationRad(1.0, 15);
  assert.ok(Math.abs(rotMax - (15 * Math.PI) / 180) < 0.0001);
});
