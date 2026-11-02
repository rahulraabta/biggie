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

const event: GdeltEvent = {
  globalEventId: '1', date: '20261102', actor1: 'Residents', actor2: 'Council',
  eventCode: '071', goldsteinScale: 5, numMentions: 128, avgTone: 0,
  actionCountryCode: 'IN', sourceUrl: 'https://example.com/local-announcement',
};
const config = {
  ...loadRelevanceConfig(), minRelevanceScore: 0.3, minNumMentions: 1,
  targetSectors: ['energy'], customKeywords: ['ai', 'supply chain'], priorityCountries: ['in'],
};

test('high prominence and priority geography cannot bypass topic filters', () => {
  const result = evaluateEventRelevance(event, config);
  assert.ok(result.score > config.minRelevanceScore);
  assert.equal(result.isRelevant, false);
});

test('either a target sector or a custom keyword satisfies the topic filter', () => {
  const sector = evaluateEventRelevance({ ...event, actor1: 'Energy' }, config);
  assert.equal(sector.isRelevant, true);
  assert.deepEqual(sector.matchedSectors, ['energy']);
  assert.deepEqual(sector.matchedKeywords, []);
  const keyword = evaluateEventRelevance({ ...event, actor1: 'AI' }, config);
  assert.equal(keyword.isRelevant, true);
  assert.deepEqual(keyword.matchedSectors, []);
  assert.deepEqual(keyword.matchedKeywords, ['ai']);
});

test('short keywords and complete multiword phrases match URL separators', () => {
  const result = evaluateEventRelevance({ ...event, sourceUrl: 'https://example.com/AI-supply-chain' }, config);
  assert.equal(result.isRelevant, true);
  assert.deepEqual(result.matchedKeywords, ['ai', 'supply chain']);
  const unrelated = evaluateEventRelevance({ ...event, sourceUrl: 'https://example.com/retail-supply-chairs' }, config);
  assert.equal(unrelated.isRelevant, false);
  assert.deepEqual(unrelated.matchedKeywords, []);
});

test('singular startup matches a configured startups sector', () => {
  const result = evaluateEventRelevance({ ...event, actor1: 'Startup' }, { ...config, targetSectors: ['startups'], customKeywords: [] });
  assert.equal(result.isRelevant, true);
  assert.deepEqual(result.matchedSectors, ['startups']);
});

test('matching topics still require the configured relevance score', () => {
  const matching = { ...event, actor1: 'Energy' };
  const score = evaluateEventRelevance(matching, config).score;
  assert.equal(evaluateEventRelevance(matching, { ...config, minRelevanceScore: score }).isRelevant, true);
  assert.equal(evaluateEventRelevance(matching, { ...config, minRelevanceScore: score + 0.001 }).isRelevant, false);
});
