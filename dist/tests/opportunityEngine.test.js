"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const opportunityEngine_js_1 = require("../src/services/opportunityEngine.js");
const clusteringService_js_1 = require("../src/services/clusteringService.js");
(0, node_test_1.default)('calculateProbabilityScore - calculates weighted probability correctly', () => {
    // Formula: (80 * 0.4) + (90 * 0.4) + (70 * 0.2) = 32 + 36 + 14 = 82
    const score = (0, opportunityEngine_js_1.calculateProbabilityScore)(80, 90, 70);
    strict_1.default.equal(score, 82);
    // Test clamping values out of 0-100 range
    const clampedScore = (0, opportunityEngine_js_1.calculateProbabilityScore)(120, -10, 50);
    // (100 * 0.4) + (0 * 0.4) + (50 * 0.2) = 40 + 0 + 10 = 50
    strict_1.default.equal(clampedScore, 50);
});
(0, node_test_1.default)('mapProbabilityToBand - maps scores to green, orange, red bands', () => {
    strict_1.default.equal((0, opportunityEngine_js_1.mapProbabilityToBand)(25), 'red');
    strict_1.default.equal((0, opportunityEngine_js_1.mapProbabilityToBand)(40), 'red');
    strict_1.default.equal((0, opportunityEngine_js_1.mapProbabilityToBand)(41), 'orange');
    strict_1.default.equal((0, opportunityEngine_js_1.mapProbabilityToBand)(70), 'orange');
    strict_1.default.equal((0, opportunityEngine_js_1.mapProbabilityToBand)(71), 'green');
    strict_1.default.equal((0, opportunityEngine_js_1.mapProbabilityToBand)(95), 'green');
});
(0, node_test_1.default)('areArticlesSimilar & clusterArticles - clusters articles by actors and sectors', () => {
    const art1 = {
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
    const art2 = {
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
    const art3 = {
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
    strict_1.default.equal((0, clusteringService_js_1.areArticlesSimilar)(art1, art2), true);
    strict_1.default.equal((0, clusteringService_js_1.areArticlesSimilar)(art1, art3), false);
    const clusters = (0, clusteringService_js_1.clusterArticles)([art1, art2, art3]);
    strict_1.default.equal(clusters.length, 2);
    strict_1.default.equal(clusters[0].article_count, 2);
    strict_1.default.equal(clusters[1].article_count, 1);
});
(0, node_test_1.default)('generateOpportunitiesForCluster - generates structured opportunities with probability score & band', async () => {
    const mockCluster = {
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
    const opportunities = await (0, opportunityEngine_js_1.generateOpportunitiesForCluster)(mockCluster);
    strict_1.default.ok(opportunities.length >= 1);
    const firstOpp = opportunities[0];
    strict_1.default.equal(firstOpp.cluster_id, 99);
    strict_1.default.ok(['business', 'innovation', 'investment'].includes(firstOpp.type));
    strict_1.default.ok(firstOpp.probability_score >= 0 && firstOpp.probability_score <= 100);
    strict_1.default.ok(['red', 'orange', 'green'].includes(firstOpp.band));
});
