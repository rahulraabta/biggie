import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ExtractorOutputSchema,
  MarketSignalSchema,
  OpportunityEvaluatorError,
  OpportunityScorecardSchema,
  mapWithConcurrency,
  normalizeRawText,
  toEvaluatorError,
  tryEvaluateOpportunity,
  verifyExtractionGrounding,
  type ExtractorOutput,
} from '../services/opportunity-evaluator.js';

/** Minimal valid pass 1 payload; overrides let each test vary one field. */
function makeExtraction(overrides: Partial<ExtractorOutput> = {}): ExtractorOutput {
  return {
    title: 'Green Hydrogen Corridor',
    sector: 'energy',
    region: 'IN',
    summary: 'Electrolyzer supply gaps and tariff support open a tier-2 component opportunity.',
    marketSignals: [
      {
        signal: 'Import tariffs on electrolyzer stacks increased, favouring local assembly.',
        category: 'policy',
        strength: 8,
        evidenceQuote: 'tariffs on imported electrolyzer stacks rose to 18%',
      },
    ],
    entities: [
      { name: 'Ministry of New and Renewable Energy', kind: 'government', jurisdiction: 'IN', role: 'Sets subsidy terms.' },
    ],
    revenueVectors: [
      {
        name: 'Tier-2 stack assembly',
        model: 'hardware',
        targetCustomer: 'Utility-scale hydrogen developers',
        estimatedAnnualValueUsd: 42_000_000,
        timeToRevenueMonths: 14,
        rationale: 'Existing electronics manufacturing base can be retooled quickly.',
      },
    ],
    ...overrides,
  };
}

test('Schemas - strict objects reject unknown keys at every depth', () => {
  const valid = makeExtraction();
  assert.equal(ExtractorOutputSchema.safeParse(valid).success, true);

  assert.equal(ExtractorOutputSchema.safeParse({ ...valid, extra: 1 }).success, false);
  assert.equal(
    ExtractorOutputSchema.safeParse({
      ...valid,
      marketSignals: [{ ...valid.marketSignals[0], sneaky: true }],
    }).success,
    false
  );
  assert.equal(MarketSignalSchema.safeParse({ ...valid.marketSignals[0], strength: 11 }).success, false);
});

test('Schemas - confidence score is bounded to 1-100', () => {
  const scorecard = {
    title: 'Green Hydrogen Corridor',
    sector: 'energy',
    region: 'IN',
    strategicSummary:
      'Thesis: tier-2 electrolyzer assembly is the binding constraint. Evidence: tariff shift plus existing electronics base. Constraint: capital intensity.',
    confidenceScore: 72,
    recommendation: 'pursue-with-conditions',
    timeToFirstRevenueMonths: 14,
    feasibility: { technical: 7, commercial: 6, regulatory: 8, capitalIntensity: 9 },
    keySignals: makeExtraction().marketSignals,
    revenueVectors: [
      {
        name: 'Tier-2 stack assembly',
        model: 'hardware',
        targetCustomer: 'Utility-scale hydrogen developers',
        estimatedAnnualValueUsd: 42_000_000,
        timeToRevenueMonths: 14,
      },
    ],
    riskRegister: [
      {
        risk: 'Electrolyzer demand slips if subsidy regimes change.',
        severity: 'high',
        likelihood: 'possible',
        mitigation: 'Diversify into industrial electrolysis demand.',
      },
    ],
    requiredResources: [
      { resource: 'Coating line', kind: 'infrastructure', criticality: 'critical', estimatedCostUsd: 8_000_000, leadTimeWeeks: 40 },
    ],
    criticalBlockers: ['No domestic membrane supplier.'],
    nextSteps: [{ step: 'Qualify two membrane suppliers.', owner: 'Founder', horizonDays: 45 }],
  };

  assert.equal(OpportunityScorecardSchema.safeParse(scorecard).success, true);
  assert.equal(OpportunityScorecardSchema.safeParse({ ...scorecard, confidenceScore: 0 }).success, false);
  assert.equal(OpportunityScorecardSchema.safeParse({ ...scorecard, confidenceScore: 101 }).success, false);
  assert.equal(OpportunityScorecardSchema.safeParse({ ...scorecard, confidenceScore: 72.5 }).success, false);
});
test('normalizeRawText - guards input length and collapses whitespace', () => {
  assert.throws(
    () => normalizeRawText('too short'),
    (err: unknown) => err instanceof OpportunityEvaluatorError && err.stage === 'input'
  );
  assert.throws(
    () => normalizeRawText('x'.repeat(60_001)),
    (err: unknown) => err instanceof OpportunityEvaluatorError && err.stage === 'input'
  );
  // @ts-expect-error runtime type guard
  assert.throws(() => normalizeRawText(undefined), (err: unknown) => err instanceof OpportunityEvaluatorError);

  const messy = `  Line one.\t\tLine two.${'\r\n'}${'  '}Line three.  `;
  assert.equal(normalizeRawText(messy.repeat(20)).includes('\t'), false);
});

test('verifyExtractionGrounding - matches only verbatim quotes', async () => {
  const rawText =
    'Policy update: tariffs on imported electrolyzer stacks rose to 18% this quarter, and grid capex guidance was raised.';

  const grounded = makeExtraction();
  const report = await verifyExtractionGrounding(grounded, rawText);

  assert.equal(report.checkedQuotes, 1);
  assert.equal(report.matchedQuotes, 1);
  assert.equal(report.coverage, 1);
  assert.deepEqual(report.unmatchedSignals, []);

  const hallucinated = makeExtraction({
    marketSignals: [
      { ...grounded.marketSignals[0], signal: 'Invented claim.', evidenceQuote: 'a subsidy of 4 billion USD was announced' },
    ],
  });
  const badReport = await verifyExtractionGrounding(hallucinated, rawText);

  assert.equal(badReport.matchedQuotes, 0);
  assert.equal(badReport.coverage, 0);
  assert.deepEqual(badReport.unmatchedSignals, ['Invented claim.']);
});

test('verifyExtractionGrounding - ignores case and whitespace differences', async () => {
  const rawText = 'Grid capex guidance was raised by 22 percent across the region, according to the regulator.';
  const extraction = makeExtraction({
    marketSignals: [
      {
        ...makeExtraction().marketSignals[0],
        evidenceQuote: 'GRID   CAPEX\nguidance was raised by 22 percent',
      },
    ],
  });

  assert.equal((await verifyExtractionGrounding(extraction, rawText)).coverage, 1);
});

test('mapWithConcurrency - bounds in-flight work and preserves order', async () => {
  const items = Array.from({ length: 9 }, (_, index) => index);
  let inFlight = 0;
  let peak = 0;

  const results = await mapWithConcurrency(items, 3, async (item) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return item * 2;
  });

  assert.equal(peak, 3);
  assert.deepEqual(results, items.map((item) => item * 2));
  assert.deepEqual(await mapWithConcurrency([], 2, async () => 1), []);
});

test('mapWithConcurrency - rejects invalid limits and surfaces worker errors', async () => {
  await assert.rejects(
    () => mapWithConcurrency([1], 0, async () => 1),
    (err: unknown) => err instanceof OpportunityEvaluatorError && err.stage === 'input'
  );

  await assert.rejects(
    () =>
      mapWithConcurrency([1, 2, 3], 2, async (item) => {
        if (item === 2) throw new Error('worker exploded');
        return item;
      }),
    /worker exploded/
  );
});

test('toEvaluatorError - normalises unknown throws and leaves staged errors intact', () => {
  const staged = new OpportunityEvaluatorError('critic', 'already staged', { retryable: true });
  assert.equal(toEvaluatorError(staged, 'extractor'), staged);

  const mapped = toEvaluatorError(new Error('socket hang up'), 'synthesizer');
  assert.equal(mapped.stage, 'synthesizer');
  assert.equal(mapped.retryable, false);
  assert.equal(mapped.cause instanceof Error, true);

  const aborted = new Error('aborted');
  aborted.name = 'AbortError';
  assert.equal(toEvaluatorError(aborted, 'extractor').retryable, false);
});

test('tryEvaluateOpportunity - returns a result union for bad input instead of throwing', async () => {
  const result = await tryEvaluateOpportunity('nope');

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.stage, 'input');
    assert.match(result.error.message, /too short/);
  }
});