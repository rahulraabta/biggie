import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEventRelevance, GdeltEvent } from '../src/services/relevanceEngine.js';
import { loadRelevanceConfig } from '../src/config/relevanceConfig.js';

test('evaluateEventRelevance - high relevance business & technology event in India', () => {
  const config = loadRelevanceConfig();
  const sampleEvent: GdeltEvent = {
    globalEventId: '123456789',
    date: '20260825',
    actor1: 'INDIAN GOVERNMENT',
    actor2: 'SEMICONDUCTOR MANUFACTURER',
    eventCode: '071', // Economic aid & investments
    goldsteinScale: 7.0,
    numMentions: 15,
    avgTone: 4.5,
    actionCountryCode: 'IN',
    sourceUrl: 'https://example.com/india-semiconductor-startup-funding-expansion',
  };

  const evalRes = evaluateEventRelevance(sampleEvent, config);

  assert.equal(evalRes.isRelevant, true);
  assert.ok(evalRes.score >= 0.5, `Expected score >= 0.5, got ${evalRes.score}`);
  assert.ok(evalRes.matchedSectors.includes('technology') || evalRes.matchedSectors.includes('manufacturing') || evalRes.matchedSectors.includes('startups'));
  assert.ok(evalRes.matchedKeywords.includes('funding') || evalRes.matchedKeywords.includes('semiconductor'));
  assert.equal(evalRes.breakdown.geoScore, 1.0);
});

test('evaluateEventRelevance - low relevance event filtered out', () => {
  const config = loadRelevanceConfig();
  const lowRelEvent: GdeltEvent = {
    globalEventId: '987654321',
    date: '20260825',
    actor1: 'CITIZEN',
    actor2: 'NEIGHBOR',
    eventCode: '010',
    goldsteinScale: 0.0,
    numMentions: 1, // Below min mentions threshold (2)
    avgTone: 0.0,
    actionCountryCode: 'ZZ',
    sourceUrl: 'https://example.com/local-neighborhood-dispute',
  };

  const evalRes = evaluateEventRelevance(lowRelEvent, config);
  assert.equal(evalRes.isRelevant, false);
});
