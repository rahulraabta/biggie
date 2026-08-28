import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProbabilityScore,
  mapProbabilityToBand,
  generateOpportunitiesForCluster,
} from '../src/services/opportunityEngine.js';
import { areArticlesSimilar, clusterArticles, ArticleRecord, StoryClusterRecord } from '../src/services/clusteringService.js';

test('calculateProbabilityScore - calculates weighted probability correctly', () => {
  // Formula: (80 * 0.4) + (90 * 0.4) + (70 * 0.2) = 32 + 36 + 14 = 82
  const score = calculateProbabilityScore(80, 90, 70);
  assert.equal(score, 82);

  // Test clamping values out of 0-100 range
  const clampedScore = calculateProbabilityScore(120, -10, 50);
  // (100 * 0.4) + (0 * 0.4) + (50 * 0.2) = 40 + 0 + 10 = 50
  assert.equal(clampedScore, 50);
});

test('mapProbabilityToBand - maps scores to green, orange, red bands', () => {
  assert.equal(mapProbabilityToBand(25), 'red');
  assert.equal(mapProbabilityToBand(40), 'red');
  assert.equal(mapProbabilityToBand(41), 'orange');
  assert.equal(mapProbabilityToBand(70), 'orange');
  assert.equal(mapProbabilityToBand(71), 'green');
  assert.equal(mapProbabilityToBand(95), 'green');
});

test('areArticlesSimilar & clusterArticles - clusters articles by actors and sectors', () => {
  const art1: ArticleRecord = {
    id: 1,
    source: 'gdelt',
    external_id: 'e1',
    title: 'India Semiconductor Expansion',
    url: 'https://news.example.com/1',
    published_at: new Date().toISOString(),
    country_code: 'IN',
    actor_1: 'INDIAN GOVERNMENT',
    actor_2: 'INTEL',
    event_code: '071',
    goldstein_scale: 7.0,
    num_mentions: 10,
    avg_tone: 4.0,
    relevance_score: 0.8,
    matched_sectors: ['technology', 'manufacturing'],
    cluster_id: null,
  };

  const art2: ArticleRecord = {
    id: 2,
    source: 'gdelt',
    external_id: 'e2',
    title: 'Intel Inks Deal with Indian Ministry',
    url: 'https://news.example.com/2',
    published_at: new Date().toISOString(),
    country_code: 'IN',
    actor_1: 'INTEL',
    actor_2: 'INDIAN GOVERNMENT',
    event_code: '071',
    goldstein_scale: 7.5,
    num_mentions: 12,
    avg_tone: 5.0,
    relevance_score: 0.85,
    matched_sectors: ['technology'],
    cluster_id: null,
  };

  const art3: ArticleRecord = {
    id: 3,
    source: 'gdelt',
    external_id: 'e3',
    title: 'Unrelated EU Farm Policy',
    url: 'https://news.example.com/3',
    published_at: new Date().toISOString(),
    country_code: 'FR',
    actor_1: 'FARMERS UNION',
    actor_2: 'EU BOARD',
    event_code: '010',
    goldstein_scale: 1.0,
    num_mentions: 2,
    avg_tone: -1.0,
    relevance_score: 0.4,
    matched_sectors: ['agriculture'],
    cluster_id: null,
  };

  assert.equal(areArticlesSimilar(art1, art2), true);
  assert.equal(areArticlesSimilar(art1, art3), false);

  const clusters = clusterArticles([art1, art2, art3]);
  assert.equal(clusters.length, 2);
  assert.equal(clusters[0].article_count, 2);
  assert.equal(clusters[1].article_count, 1);
});

test('generateOpportunitiesForCluster - generates structured opportunities with probability score & band', async () => {
  const mockCluster: StoryClusterRecord = {
    id: 99,
    title: 'India Semiconductor Expansion Signal',
    topic_label: 'Technology - IN',
    dominant_sector: 'technology',
    primary_region: 'IN',
    article_count: 2,
    articles: [
      {
        id: 1,
        source: 'gdelt',
        external_id: 'e1',
        title: 'India Fab Grant',
        url: 'https://news.example.com/1',
        published_at: new Date().toISOString(),
        country_code: 'IN',
        actor_1: 'INDIAN GOV',
        actor_2: 'FAB CORP',
        event_code: '071',
        goldstein_scale: 8.0,
        num_mentions: 20,
        avg_tone: 4.5,
        relevance_score: 0.85,
        matched_sectors: ['technology', 'manufacturing'],
        cluster_id: 99,
      },
    ],
  };

  const opportunities = await generateOpportunitiesForCluster(mockCluster);
  assert.ok(opportunities.length >= 1);

  const firstOpp = opportunities[0];
  assert.equal(firstOpp.cluster_id, 99);
  assert.ok(['business', 'innovation', 'investment'].includes(firstOpp.type));
  assert.ok(firstOpp.probability_score >= 0 && firstOpp.probability_score <= 100);
  assert.ok(['red', 'orange', 'green'].includes(firstOpp.band));
});
