import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProbabilityScore,
  mapProbabilityToBand,
  generateOpportunitiesForCluster,
  processClusterOpportunities,
} from '../src/services/opportunityEngine.js';
import { getPool } from '../src/db/index.js';
import { completeChat, getLlmConfig, LlmNonRetryableError } from '../src/services/llmGateway.js';
import { reasonAboutCluster, type RawLlmOpportunity } from '../src/services/opportunityReasoning.js';
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

test('generateOpportunitiesForCluster - generates structured opportunities with probability score & band', async (t) => {
  const calls = mockCompletions(t, [research(), analysis(), critique(true)]);
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
  assert.equal(firstOpp.probability_score, 80);
  assert.equal(firstOpp.validated_output?.review.status, 'APPROVED');
  assert.equal(firstOpp.historical_context, '');
  assert.equal(calls.length, 3);
  assert.match(calls[0].messages[0].content, /The Researcher/);
  assert.match(calls[1].messages[0].content, /The Analyst/);
  assert.match(calls[2].messages[0].content, /The Critic/);
  assert.deepEqual(JSON.parse(calls[1].messages[1].content).research, research());
  assert.equal(firstOpp.validated_output?.opportunity.probability_score, 80);
});

function research() {
  return {
    facts: [{ id: 'F1', statement: 'India Fab Grant is reported.', citations: [{ source_id: 1, quote: 'India Fab Grant' }] }],
    entities: [{ name: 'FAB CORP', kind: 'organization', source_ids: [1] }],
    region: 'IN',
    primary_industry: 'semiconductors',
    summary: 'India Fab Grant is reported. FAB CORP is named in the event.',
    unknowns: ['Customer demand has not been measured.'],
  };
}

function opportunity(value = 80): RawLlmOpportunity {
  const calculation = (factors: string[]) => ({
    components: factors.map((factor) => ({ factor, score: value, rationale: 'Conditional estimate from F1.' })),
    calculation: `(${value}+${value}+${value})/3=${value}`,
    rationale: 'Requires commercial validation.',
  });
  return {
    type: 'business', title: 'Fab supplier qualification service', short_description: 'Qualify suppliers for fabs.',
    long_description: 'Proposed supplier qualification service for semiconductor manufacturers.',
    core_problem: 'Manufacturers require qualified suppliers.', actionable_venture_model: 'Sell supplier qualification services to manufacturers.',
    feasibility_score: value, impact_score: value, time_to_market_score: value,
    probability_score: value,
    risks: ['Demand remains unverified.'], assumptions: ['Manufacturers would pay for qualification.'],
    specific_catalysts: [], evidence_fact_ids: ['F1'],
    market: { region: 'IN', customer: 'Semiconductor manufacturers', problem: 'Supplier qualification', product: 'Qualification report', monetization: 'Fee per qualification' },
    score_calculations: {
      feasibility: calculation(['technical readiness', 'capital/resources', 'regulatory readiness']),
      impact: calculation(['market need', 'customer value', 'reach']),
      time_to_market: calculation(['product readiness', 'delivery speed', 'deployment simplicity']),
      viability: { calculation: `${value}*0.4+${value}*0.4+${value}*0.2=${value}`, rationale: 'Weighted conditional assessment.' },
    },
  };
}

function analysis(value = 80) { return { opportunities: [opportunity(value)] }; }
function critique(approved: boolean): { status: 'APPROVED' } | { status: 'REJECTED'; reason: string } {
  return approved ? { status: 'APPROVED' } : { status: 'REJECTED', reason: 'Identify a payer and label demand as an assumption.' };
}

function cluster(): StoryClusterRecord {
  return {
    id: 99, title: 'India Semiconductor Expansion', topic_label: 'Technology - IN', dominant_sector: 'technology', primary_region: 'IN', article_count: 1,
    articles: [{ id: 1, source: 'gdelt', external_id: 'e1', title: 'India Fab Grant', url: 'https://news.example.com/1',
      published_at: '2026-11-01T00:00:00Z', country_code: 'IN', actor_1: 'INDIAN GOV', actor_2: 'FAB CORP', event_code: '071',
      goldstein_scale: 8, num_mentions: 20, avg_tone: 4.5, relevance_score: 0.85, matched_sectors: ['technology'], cluster_id: 99 }],
  };
}

function mockCompletions(t: TestContext, replies: unknown[]) {
  const calls: Array<{ messages: Array<{ role: string; content: string }>; response_format: { type: string } }> = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    if (!String(input).endsWith('/chat/completions')) {
      return new Response(JSON.stringify({ data: [{ index: 0, embedding: [0.1] }] }));
    }
    const reply = replies[calls.length];
    calls.push(JSON.parse(init?.body as string));
    assert.notEqual(reply, undefined, 'unexpected extra LLM call');
    return new Response(JSON.stringify({ model: 'local-test-model', choices: [{ message: { content: typeof reply === 'string' ? reply : JSON.stringify(reply) } }] }));
  });
  return calls;
}

test('Critic feedback is sent to the Analyst and approved revision is returned', async (t) => {
  const calls = mockCompletions(t, [research(), analysis(), critique(false), analysis(), critique(true)]);
  const outputs = await reasonAboutCluster(cluster());
  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].attempts, 2);
  assert.equal(calls.length, 5);
  assert.match(calls[3].messages[1].content, /Identify a payer/);
  assert.ok(calls.every((call) => call.response_format.type === 'json_object'));
});

test('repeated Critic rejection is bounded and never persisted', async (t) => {
  mockCompletions(t, [research(), analysis(), critique(false), analysis(), critique(false), analysis(), critique(false)]);
  const query = t.mock.method(getPool(), 'query');
  const result = await processClusterOpportunities([cluster()], { delayMs: 0 });
  assert.equal(result.opportunitiesGenerated, 0);
  assert.equal(query.mock.callCount(), 0);
});

test('Critic logs approval and rejection decision counts including revisions', async (t) => {
  const info = t.mock.method(console, 'info', () => {});
  const warning = t.mock.method(console, 'warn', () => {});
  mockCompletions(t, [research(), analysis(), critique(false), analysis(), critique(true)]);
  await reasonAboutCluster(cluster());
  assert.match(warning.mock.calls[0].arguments[0], /REJECTED.*approved=0 rejected=1: Identify a payer/);
  assert.match(info.mock.calls[0].arguments[0], /APPROVED.*approved=1 rejected=1/);
  assert.match(info.mock.calls[1].arguments[0], /cluster=99 decisions: approved=1 rejected=1/);
});

test('Critic logs totals when every attempt is rejected', async (t) => {
  const info = t.mock.method(console, 'info', () => {});
  t.mock.method(console, 'warn', () => {});
  mockCompletions(t, [research(), analysis(), critique(false), analysis(), critique(false), analysis(), critique(false)]);
  assert.deepEqual(await reasonAboutCluster(cluster()), []);
  assert.match(info.mock.calls[0].arguments[0], /approved=0 rejected=3/);
});

test('Researcher requires an industry and exactly two summary sentences', async (t) => {
  for (const invalid of [
    { ...research(), primary_industry: undefined }, { ...research(), primary_industry: ' ' },
    { ...research(), summary: 'Only one sentence.' }, { ...research(), summary: 'One. Two. Three.' },
  ]) {
    const calls = mockCompletions(t, [invalid]);
    await assert.rejects(reasonAboutCluster(cluster()), /primary_industry|exactly two sentences/);
    assert.equal(calls.length, 1);
    t.mock.restoreAll();
  }
});

test('Analyst weighted viability uses all three dimensions and rejects incorrect arithmetic', async (t) => {
  const draft = opportunity();
  draft.impact_score = 90;
  draft.time_to_market_score = 70;
  draft.score_calculations.impact.components.forEach((item) => { item.score = 90; });
  draft.score_calculations.impact.calculation = '(90+90+90)/3=90';
  draft.score_calculations.time_to_market.components.forEach((item) => { item.score = 70; });
  draft.score_calculations.time_to_market.calculation = '(70+70+70)/3=70';
  draft.score_calculations.viability.calculation = '80*0.4+90*0.4+70*0.2=82';
  const invalid = { opportunities: [draft] };
  const valid = { opportunities: [{ ...draft, probability_score: 82 }] };
  const calls = mockCompletions(t, [research(), invalid, valid, critique(true)]);
  const [output] = await generateOpportunitiesForCluster(cluster());
  assert.equal(output.probability_score, 82);
  assert.equal(output.validated_output?.opportunity.probability_score, 82);
  assert.equal(output.validated_output?.attempts, 2);
  assert.match(calls[2].messages[1].content, /Viability must equal/);
});

test('Researcher cannot fabricate citations, entities, or regions', async (t) => {
  const invented = [
    { ...research(), region: 'US' },
    { ...research(), facts: [{ id: 'F1', statement: 'Invented grant', citations: [{ source_id: 1, quote: 'Billion dollar grant' }] }] },
    { ...research(), entities: [{ name: 'Invented Corp', kind: 'organization', source_ids: [1] }] },
  ];
  for (const output of invented) {
    mockCompletions(t, [output]);
    await assert.rejects(reasonAboutCluster(cluster()), /unsupported|ungrounded/);
    t.mock.restoreAll();
  }
});

test('evidence citations preserve original PostgreSQL article ids', async (t) => {
  const input = cluster();
  input.articles[0].id = 4152;
  const evidence = research();
  evidence.facts[0].citations[0].source_id = 4152;
  evidence.entities[0].source_ids = [4152];
  mockCompletions(t, [evidence, analysis(), critique(true)]);
  const [output] = await reasonAboutCluster(input);
  assert.equal(output.research.facts[0].citations[0].source_id, 4152);
});

test('malformed Analyst JSON is returned for correction', async (t) => {
  const calls = mockCompletions(t, [research(), '{broken', analysis(), critique(true)]);
  const outputs = await reasonAboutCluster(cluster());
  assert.equal(outputs[0].attempts, 2);
  assert.match(calls[2].messages[1].content, /validationFeedback/);
});

test('invalid scores and evidence references cannot pass validation', async (t) => {
  for (const invalid of [
    { ...opportunity(), feasibility_score: 101 },
    { ...opportunity(), impact_score: 79 },
    { ...opportunity(), time_to_market_score: '80' },
    { ...opportunity(), probability_score: 79 },
    { ...opportunity(), evidence_fact_ids: ['missing-fact'] },
    { ...opportunity(), type: 'unsupported' },
    { ...opportunity(), market: { ...opportunity().market, customer: '' } },
  ]) {
    const draft = { opportunities: [invalid] };
    const calls = mockCompletions(t, [research(), draft, draft, draft]);
    await assert.rejects(reasonAboutCluster(cluster()), /failed validation/);
    assert.equal(calls.length, 4);
    t.mock.restoreAll();
  }
});

test('zero scores remain zero', async (t) => {
  mockCompletions(t, [research(), analysis(0), critique(true)]);
  const [output] = await generateOpportunitiesForCluster(cluster());
  assert.equal(output.feasibility_score, 0);
  assert.equal(output.impact_score, 0);
  assert.equal(output.time_to_market_score, 0);
  assert.equal(output.probability_score, 0);
});

test('malformed, ambiguous, and legacy Critic responses never reach PostgreSQL', async (t) => {
  for (const response of [
    '{broken', {}, { status: 'approved' }, { status: 'REJECTED' }, { status: 'REJECTED', reason: ' ' },
    { status: 'APPROVED', reason: 'Invented market.' }, { reviews: [{ approved: true }] },
  ]) {
    mockCompletions(t, [research(), analysis(), response]);
    const query = t.mock.method(getPool(), 'query');
    const result = await processClusterOpportunities([cluster()], { delayMs: 0 });
    assert.equal(result.opportunitiesGenerated, 0);
    assert.equal(query.mock.callCount(), 0);
    t.mock.restoreAll();
  }
});

test('approved opportunities are retained while only rejected types are revised', async (t) => {
  const innovation = { ...opportunity(), type: 'innovation', title: 'Fab inspection prototype' };
  const calls = mockCompletions(t, [research(), { opportunities: [opportunity(), innovation] }, critique(true), critique(false), { opportunities: [innovation] }, critique(true)]);
  const outputs = await reasonAboutCluster(cluster());
  assert.deepEqual(outputs.map((output) => output.opportunity.type), ['business', 'innovation']);
  const revisionInput = JSON.parse(calls[4].messages[1].content);
  assert.equal(revisionInput.revisions.length, 1);
  assert.equal(revisionInput.revisions[0].opportunity.type, 'innovation');
  assert.equal(calls.length, 6);
  assert.equal(JSON.parse(calls[2].messages[1].content).opportunity.type, 'business');
  assert.equal(JSON.parse(calls[3].messages[1].content).opportunity.type, 'innovation');
});

test('empty evidence does not generate opportunities and dry runs never write', async (t) => {
  mockCompletions(t, [{ ...research(), facts: [], entities: [] }]);
  assert.deepEqual(await reasonAboutCluster(cluster()), []);
  t.mock.restoreAll();
  mockCompletions(t, [research(), analysis(), critique(true)]);
  const query = t.mock.method(getPool(), 'query');
  const result = await processClusterOpportunities([cluster()], { dryRun: true });
  assert.equal(result.opportunitiesGenerated, 1);
  assert.equal(query.mock.callCount(), 0);
});

test('transport failures are not sent back to the Analyst as revision feedback', async (t) => {
  const calls = mockCompletions(t, [research()]);
  const fetchResearch = globalThis.fetch;
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requests++;
    if (requests === 1) return fetchResearch(input, init);
    return new Response('Unauthorized', { status: 401 });
  });
  await assert.rejects(reasonAboutCluster(cluster()), /Configuration Error/);
  assert.equal(requests, 2);
  assert.equal(calls.length, 1);
});

test('approved JSON and calculated scores are saved to PostgreSQL', async (t) => {
  mockCompletions(t, [research(), analysis(), critique(true)]);
  const inserts: unknown[][] = [];
  t.mock.method(getPool(), 'query', async (sql: string, params: unknown[]) => {
    if (sql.includes('INSERT INTO opportunities')) {
      assert.match(sql, /validated_output/);
      inserts.push(params);
      return { rows: [{ id: 501 }] };
    }
    return { rows: [] };
  });
  const result = await processClusterOpportunities([cluster()], { delayMs: 0 });
  assert.equal(result.opportunitiesGenerated, 1);
  assert.equal(inserts.length, 1);
  const saved = JSON.parse(inserts[0][20] as string);
  assert.equal(saved.review.status, 'APPROVED');
  assert.equal(saved.probability_score, 80);
  assert.deepEqual(saved.research, research());
  assert.deepEqual(saved.opportunity.score_calculations, opportunity().score_calculations);
});

test('database write failures propagate for pipeline retry', async (t) => {
  mockCompletions(t, [research(), analysis(), critique(true)]);
  t.mock.method(getPool(), 'query', async () => { throw new Error('write failed'); });
  await assert.rejects(processClusterOpportunities([cluster()], { delayMs: 0 }), /write failed/);
});

test('gateway sends JSON completions to the local proxy and respects port overrides', async (t) => {
  mockCompletions(t, [{}]);
  const response = await completeChat({ messages: [{ role: 'user', content: 'Return JSON.' }], jsonMode: true }, { baseUrl: 'http://127.0.0.1:8318/v1' });
  assert.equal(response.model, 'local-test-model');
  assert.equal((globalThis.fetch as unknown as { mock: { calls: Array<{ arguments: unknown[] }> } }).mock.calls[0].arguments[0], 'http://127.0.0.1:8318/v1/chat/completions');
  const originalBaseUrl = process.env.OPENAI_BASE_URL;
  try {
    process.env.OPENAI_BASE_URL = 'http://127.0.0.1:9000/v1';
    if (!process.env.LLM_BASE_URL) assert.equal(getLlmConfig().baseUrl, 'http://127.0.0.1:9000/v1');
  } finally {
    if (originalBaseUrl === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = originalBaseUrl;
  }
});

test('local-only reasoning accepts proxy ports 8318 and 8317 and disables redirects', async (t) => {
  const endpoints = ['http://127.0.0.1:8318/v1', 'http://localhost:8317/v1', 'http://[::1]:8318/v1'];
  mockCompletions(t, endpoints.map(() => ({})));
  for (const baseUrl of endpoints) {
    await completeChat({ messages: [{ role: 'user', content: 'Return JSON.' }], localProxyOnly: true }, { baseUrl });
  }
  const fetchCalls = (globalThis.fetch as unknown as { mock: { calls: Array<{ arguments: [string, RequestInit] }> } }).mock.calls;
  assert.deepEqual(fetchCalls.map((call) => call.arguments[0]), endpoints.map((url) => `${url}/chat/completions`));
  assert.ok(fetchCalls.every((call) => call.arguments[1].redirect === 'error'));
});

test('local-only reasoning rejects remote providers and unsupported ports before any request', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not reach a provider'); });
  for (const baseUrl of [
    'https://api.cohere.com/v2', 'https://api.openai.com/v1', 'http://remote.example:8318/v1',
    'http://localhost:9000/v1', 'http://localhost/v1', 'ftp://localhost:8318/v1',
  ]) {
    await assert.rejects(completeChat({ messages: [{ role: 'user', content: 'Return JSON.' }], localProxyOnly: true }, { baseUrl }),
      (error: unknown) => error instanceof LlmNonRetryableError && error.status === 400 && /8318 or 8317/.test(error.message));
  }
  assert.equal(fetch.mock.callCount(), 0);
});
