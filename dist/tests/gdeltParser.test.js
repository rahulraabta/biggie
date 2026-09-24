"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const ingest_gdelt_js_1 = require("../scripts/ingest-gdelt.js");
(0, node_test_1.default)('parseGdeltLine - parses valid GDELT TSV row correctly', () => {
    // Build a dummy 58-column tab-separated GDELT line
    const fields = new Array(60).fill('');
    fields[0] = '100000001'; // GlobalEventID
    fields[1] = '20260825'; // SQLDATE
    fields[6] = 'INDIA'; // Actor1Name
    fields[16] = 'RENEWABLE ENERGY CORP'; // Actor2Name
    fields[26] = '071'; // EventCode
    fields[30] = '7.4'; // GoldsteinScale
    fields[31] = '12'; // NumMentions
    fields[34] = '5.2'; // AvgTone
    fields[51] = 'IN'; // ActionGeo_CountryCode
    fields[57] = 'https://news.example.com/india-solar-energy-investment'; // SOURCEURL
    const line = fields.join('\t');
    const event = (0, ingest_gdelt_js_1.parseGdeltLine)(line);
    strict_1.default.notEqual(event, null);
    strict_1.default.equal(event?.globalEventId, '100000001');
    strict_1.default.equal(event?.date, '20260825');
    strict_1.default.equal(event?.actor1, 'INDIA');
    strict_1.default.equal(event?.eventCode, '071');
    strict_1.default.equal(event?.goldsteinScale, 7.4);
    strict_1.default.equal(event?.numMentions, 12);
    strict_1.default.equal(event?.actionCountryCode, 'IN');
    strict_1.default.equal(event?.sourceUrl, 'https://news.example.com/india-solar-energy-investment');
});
(0, node_test_1.default)('parseGdeltLine - returns null on invalid or missing URL', () => {
    const line = '123\t20260825\t\t\t';
    const event = (0, ingest_gdelt_js_1.parseGdeltLine)(line);
    strict_1.default.equal(event, null);
});
