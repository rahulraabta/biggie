"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const relevanceEngine_js_1 = require("../src/services/relevanceEngine.js");
const relevanceConfig_js_1 = require("../src/config/relevanceConfig.js");
(0, node_test_1.default)('evaluateEventRelevance - high relevance business & technology event in India', () => {
    const config = (0, relevanceConfig_js_1.loadRelevanceConfig)();
    const sampleEvent = {
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
    const evalRes = (0, relevanceEngine_js_1.evaluateEventRelevance)(sampleEvent, config);
    strict_1.default.equal(evalRes.isRelevant, true);
    strict_1.default.ok(evalRes.score >= 0.5, `Expected score >= 0.5, got ${evalRes.score}`);
    strict_1.default.ok(evalRes.matchedSectors.includes('technology') || evalRes.matchedSectors.includes('manufacturing') || evalRes.matchedSectors.includes('startups'));
    strict_1.default.ok(evalRes.matchedKeywords.includes('funding') || evalRes.matchedKeywords.includes('semiconductor'));
    strict_1.default.equal(evalRes.breakdown.geoScore, 1.0);
});
(0, node_test_1.default)('evaluateEventRelevance - low relevance event filtered out', () => {
    const config = (0, relevanceConfig_js_1.loadRelevanceConfig)();
    const lowRelEvent = {
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
    const evalRes = (0, relevanceEngine_js_1.evaluateEventRelevance)(lowRelEvent, config);
    strict_1.default.equal(evalRes.isRelevant, false);
});
