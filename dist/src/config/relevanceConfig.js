"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRelevanceConfig = loadRelevanceConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Parses environment variables with fallback defaults into a typed configuration.
 */
function loadRelevanceConfig() {
    const parseList = (val, defaults) => {
        if (!val || val.trim() === '')
            return defaults;
        return val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    };
    return {
        minRelevanceScore: parseFloat(process.env.MIN_RELEVANCE_SCORE || '0.35'),
        minNumMentions: parseInt(process.env.MIN_NUM_MENTIONS || '2', 10),
        minTone: parseFloat(process.env.MIN_TONE || '-10.0'),
        maxTone: parseFloat(process.env.MAX_TONE || '10.0'),
        minGoldsteinScale: parseFloat(process.env.MIN_GOLDSTEIN_SCALE || '-10.0'),
        maxGoldsteinScale: parseFloat(process.env.MAX_GOLDSTEIN_SCALE || '10.0'),
        targetSectors: parseList(process.env.TARGET_SECTORS, [
            'business',
            'innovation',
            'investment',
            'technology',
            'startups',
            'logistics',
            'energy',
            'fintech',
            'healthtech',
            'manufacturing',
            'climate',
            'market',
            'regulatory',
        ]),
        priorityCountries: parseList(process.env.PRIORITY_COUNTRIES, [
            'in', 'us', 'gb', 'sg', 'ae', 'de', 'jp', 'eu', 'global'
        ]),
        customKeywords: parseList(process.env.CUSTOM_KEYWORDS, [
            'funding',
            'startup',
            'acquisition',
            'expansion',
            'policy',
            'tariff',
            'subsidy',
            'semiconductor',
            'renewable',
            'ev',
            'supply chain',
            'investment',
            'merger',
            'regulatory',
            'venture',
            'factory',
            'patent',
            'ai',
        ]),
        dryRun: (process.env.DRY_RUN || 'false').toLowerCase() === 'true',
        batchSize: parseInt(process.env.BATCH_SIZE || '250', 10),
        gdeltMaxLines: parseInt(process.env.GDELT_MAX_LINES || '0', 10),
    };
}
