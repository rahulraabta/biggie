import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGdeltLine } from '../scripts/ingest-gdelt.js';

test('parseGdeltLine - parses valid GDELT TSV row correctly', () => {
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
  const event = parseGdeltLine(line);

  assert.notEqual(event, null);
  assert.equal(event?.globalEventId, '100000001');
  assert.equal(event?.date, '20260825');
  assert.equal(event?.actor1, 'INDIA');
  assert.equal(event?.eventCode, '071');
  assert.equal(event?.goldsteinScale, 7.4);
  assert.equal(event?.numMentions, 12);
  assert.equal(event?.actionCountryCode, 'IN');
  assert.equal(event?.sourceUrl, 'https://news.example.com/india-solar-energy-investment');
});

test('parseGdeltLine - returns null on invalid or missing URL', () => {
  const line = '123\t20260825\t\t\t';
  const event = parseGdeltLine(line);
  assert.equal(event, null);
});
