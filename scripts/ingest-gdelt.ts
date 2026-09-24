import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import readline from 'readline';
import unzipper from 'unzipper';
import { Readable } from 'node:stream';
import { PoolClient } from 'pg';
import { loadRelevanceConfig, RelevanceConfig } from '../src/config/relevanceConfig.js';
import { evaluateEventRelevance, GdeltEvent, RelevanceEvaluation } from '../src/services/relevanceEngine.js';
import { normalizeCountryCode } from '../src/utils/geoUtils.js';
import { closePool, getPool } from '../src/db/index.js';

export interface IngestionMetrics {
  totalProcessed: number;
  filteredRelevant: number;
  insertedCount: number;
  updatedCount: number;
  errorCount: number;
  isDryRun: boolean;
  durationMs: number;
}

/**
 * Executes async database or network operations with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelayMs = 1000): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[Ingestion Retry] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error('Retry limit reached');
}

/**
 * Resolves the GDELT export URL:
 * 1. Checks GDELT_URL environment variable if provided.
 * 2. If dateOverride is provided (YYYYMMDD), returns historical daily export URL.
 * 3. Fetches http://data.gdeltproject.org/gdeltv2/lastupdate.txt to extract the latest 15-min export ZIP URL.
 * 4. Falls back to yesterday's daily export URL if lastupdate.txt is unreachable.
 */
export async function getGdeltExportUrl(dateOverride?: string): Promise<string> {
  if (process.env.GDELT_URL && process.env.GDELT_URL.trim() !== '') {
    return process.env.GDELT_URL.trim();
  }

  if (dateOverride && /^\d{8}$/.test(dateOverride)) {
    return `https://data.gdeltproject.org/events/${dateOverride}.export.CSV.zip`;
  }

  try {
    const res = await fetch('http://data.gdeltproject.org/gdeltv2/lastupdate.txt', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NewsToOpportunities/1.0',
      },
    });

    if (res.ok) {
      const text = await res.text();
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('.export.CSV.zip')) {
          const parts = line.trim().split(/\s+/);
          const extractedUrl = parts.find((p) => p.startsWith('http://') || p.startsWith('https://'));
          if (extractedUrl) {
            console.log(`[GDELT URL Resolver] Discovered latest 15-minute export: ${extractedUrl}`);
            return extractedUrl;
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[GDELT URL Resolver Warning] Failed to query lastupdate.txt: ${err.message}. Falling back to daily URL.`);
  }

  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `https://data.gdeltproject.org/events/${year}${month}${day}.export.CSV.zip`;
}

/**
 * Derives a clean human-readable article title from a source URL slug or hostname.
 */
export function deriveTitleFromUrl(url: string): string {
  if (!url || typeof url !== 'string') return 'Global Market Event Signal';
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const segments = pathname.split('/').filter(Boolean);
    let lastSegment = segments.pop() || '';

    // Remove extensions like .html, .htm, .php, .aspx, .ece, .story
    let slug = lastSegment.replace(/\.(html?|php|aspx?|ece|story)$/i, '');

    // If slug is purely numeric or too short (e.g. /12345), try previous segment
    if ((/^\d+$/.test(slug) || slug.length < 3) && segments.length > 0) {
      slug = segments.pop()?.replace(/\.(html?|php|aspx?|ece|story)$/i, '') || slug;
    }

    // Replace hyphens, underscores, and URL encoded tokens with spaces
    slug = slug.replace(/[-_]+/g, ' ').replace(/%20/g, ' ').trim();

    if (slug.length > 3 && !/^\d+$/.test(slug)) {
      return slug
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    const host = parsed.hostname.replace(/^www\./i, '');
    const capitalizedHost = host.charAt(0).toUpperCase() + host.slice(1);
    return `${capitalizedHost} News Signal`;
  } catch {
    return 'Global Market Event Signal';
  }
}

/**
 * Extracts a 2-letter country code from GDELT geo columns with validation.
 *
 * Ground truth from live GDELT 2.0 exports (61 tab-separated fields):
 *   Actor1Geo_CountryCode = [37], Actor2Geo_CountryCode = [45],
 *   ActionGeo_CountryCode = [53] (preferred — where the event happened).
 * The old code read fields[51] which is ActionGeo_Type (an enum 1-5),
 * storing numeric junk like "4" into articles.country_code.
 *
 * GDELT 1.0 (58 tab-separated fields): Actor1Geo_CountryCode = [37],
 *   Actor2Geo_CountryCode = [44], ActionGeo_CountryCode = [51].
 *
 * Both layouts are probed in priority order (ActionGeo, then Actor2Geo, then
 * Actor1Geo), because padded or truncated rows make the raw column count an
 * unreliable layout signal on its own. Every candidate must be exactly two
 * A-Z letters, so a misaligned column can never leak junk.
 */
function extractCountryCode(fields: string[]): string {
  const isCountryCode = (val: string | undefined): boolean =>
    /^[A-Z]{2}$/.test((val || '').trim().toUpperCase());

  const candidates =
    fields.length > 58
      ? [53, 45, 37, 51, 44] // GDELT 2.0 layout first, then 1.0 ActionGeo/Actor2Geo
      : [51, 44, 37, 53, 45]; // GDELT 1.0 layout first, then 2.0 equivalents

  for (const idx of candidates) {
    const code = (fields[idx] || '').trim().toUpperCase();
    if (isCountryCode(code)) return code;
  }
  return '';
}

/**
 * Parses a single tab-separated line from GDELT 1.0/2.0 CSV export into a GdeltEvent object.
 */
export function parseGdeltLine(line: string): GdeltEvent | null {
  if (!line || line.trim() === '') return null;
  const fields = line.split('\t');
  if (fields.length < 57) return null;

  // In GDELT 1.0 SOURCEURL is index 57; in GDELT 2.0 SOURCEURL is index 60 (last column)
  const sourceUrl = fields[fields.length - 1]?.trim() || fields[57]?.trim();
  if (!sourceUrl || (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://'))) {
    return null;
  }

  return {
    globalEventId: fields[0]?.trim() || '',
    date: fields[1]?.trim() || '',
    actor1: fields[6]?.trim() || fields[7]?.trim() || '',
    actor2: fields[16]?.trim() || fields[17]?.trim() || '',
    eventCode: fields[26]?.trim() || '',
    goldsteinScale: parseFloat(fields[30] || '0.0') || 0.0,
    numMentions: parseInt(fields[31] || '1', 10) || 1,
    avgTone: parseFloat(fields[34] || '0.0') || 0.0,
    actionCountryCode: extractCountryCode(fields),
    sourceUrl,
  };
}

/**
 * Upserts a batch of relevant events into the PostgreSQL database.
 */
async function upsertEventBatch(
  client: PoolClient,
  batch: Array<{ event: GdeltEvent; evalRes: RelevanceEvaluation }>
): Promise<{ inserted: number; updated: number }> {
  if (batch.length === 0) return { inserted: 0, updated: 0 };

  const uniqueBatchMap = new Map<string, { event: GdeltEvent; evalRes: RelevanceEvaluation }>();

  for (const item of batch) {
    const existing = uniqueBatchMap.get(item.event.sourceUrl);
    if (!existing) {
      uniqueBatchMap.set(item.event.sourceUrl, {
        event: { ...item.event },
        evalRes: {
          ...item.evalRes,
          matchedSectors: [...item.evalRes.matchedSectors],
        },
      });
    } else {
      existing.event.numMentions += item.event.numMentions;
      existing.event.goldsteinScale = item.event.goldsteinScale;
      existing.event.avgTone = item.event.avgTone;
      if (item.evalRes.score > existing.evalRes.score) {
        existing.evalRes.score = item.evalRes.score;
      }
      const combinedSectors = Array.from(
        new Set([...existing.evalRes.matchedSectors, ...item.evalRes.matchedSectors])
      );
      existing.evalRes.matchedSectors = combinedSectors;
    }
  }

  const uniqueBatch = Array.from(uniqueBatchMap.values());
  const valueTuples: string[] = [];
  const queryValues: any[] = [];

  uniqueBatch.forEach(({ event, evalRes }, idx) => {
    const derivedTitle = deriveTitleFromUrl(event.sourceUrl);
    // GDELT emits FIPS 10-4 codes (CH=China, JA=Japan) — normalize to ISO so
    // IN/US/CN/JP filters and capital-coordinate fallbacks resolve correctly.
    const isoCountryCode = normalizeCountryCode(event.actionCountryCode);
    const offset = idx * 14;
    valueTuples.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`
    );

    let publishedAt: string | null = null;
    if (event.date && event.date.length === 8) {
      publishedAt = `${event.date.substring(0, 4)}-${event.date.substring(4, 6)}-${event.date.substring(6, 8)}T00:00:00Z`;
    }

    queryValues.push(
      'gdelt',
      event.globalEventId,
      derivedTitle,
      event.sourceUrl,
      publishedAt,
      isoCountryCode,
      event.actor1,
      event.actor2,
      event.eventCode,
      event.goldsteinScale,
      event.numMentions,
      event.avgTone,
      evalRes.score,
      evalRes.matchedSectors
    );
  });

  const query = `
    INSERT INTO articles (
      source, external_id, title, url, published_at, country_code, actor_1, actor_2,
      event_code, goldstein_scale, num_mentions, avg_tone, relevance_score, matched_sectors
    )
    VALUES ${valueTuples.join(', ')}
    ON CONFLICT (url) DO UPDATE SET
      title = COALESCE(articles.title, EXCLUDED.title),
      -- Repair legacy rows whose country_code holds GDELT ActionGeo_Type junk
      -- (digits 0-5) instead of a real ISO code; keep any already-valid value.
      country_code = CASE
        WHEN articles.country_code ~ '^[A-Z]{2}$' THEN articles.country_code
        ELSE EXCLUDED.country_code
      END,
      num_mentions = articles.num_mentions + EXCLUDED.num_mentions,
      goldstein_scale = EXCLUDED.goldstein_scale,
      avg_tone = EXCLUDED.avg_tone,
      relevance_score = GREATEST(articles.relevance_score, EXCLUDED.relevance_score),
      matched_sectors = ARRAY(SELECT DISTINCT unnest(articles.matched_sectors || EXCLUDED.matched_sectors))
    RETURNING (xmax = 0) AS is_inserted;
  `;

  const result = await client.query(query, queryValues);
  let inserted = 0;
  let updated = 0;
  result.rows.forEach((row) => {
    if (row.is_inserted) inserted++;
    else updated++;
  });

  return { inserted, updated };
}

/**
 * Logs metrics into the database `ingestion_runs` table.
 */
async function recordIngestionRun(client: PoolClient, metrics: IngestionMetrics): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const query = `
    INSERT INTO ingestion_runs (
      source, run_date, total_processed, filtered_relevant,
      inserted_count, updated_count, error_count, is_dry_run, duration_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
  `;
  await client.query(query, [
    'gdelt',
    today,
    metrics.totalProcessed,
    metrics.filteredRelevant,
    metrics.insertedCount,
    metrics.updatedCount,
    metrics.errorCount,
    metrics.isDryRun,
    metrics.durationMs,
  ]);
}

/**
 * Main ingestion orchestration function.
 */
export async function runIngestion(options?: {
  dryRun?: boolean;
  maxLines?: number;
  urlOverride?: string;
  config?: RelevanceConfig;
}): Promise<IngestionMetrics> {
  const startTime = Date.now();
  const config = options?.config || loadRelevanceConfig();
  const isDryRun = options?.dryRun ?? config.dryRun;
  const maxLines = options?.maxLines ?? config.gdeltMaxLines;
  const targetUrl = options?.urlOverride || (await getGdeltExportUrl());

  const metrics: IngestionMetrics = {
    totalProcessed: 0,
    filteredRelevant: 0,
    insertedCount: 0,
    updatedCount: 0,
    errorCount: 0,
    isDryRun,
    durationMs: 0,
  };

  console.log(`\n================ GDELT INGESTION RUN ================`);
  console.log(`Source URL:       ${targetUrl}`);
  console.log(`Execution Mode:   ${isDryRun ? 'DRY-RUN (No DB Writes)' : 'PRODUCTION DB PERSISTENCE'}`);
  console.log(`Min Rel Score:    ${config.minRelevanceScore}`);
  console.log(`Target Sectors:   ${config.targetSectors.join(', ')}`);
  console.log(`Priority Regions: ${config.priorityCountries.join(', ')}`);
  console.log(`====================================================\n`);

  let dbClient: PoolClient | null = null;
  if (!isDryRun) {
    dbClient = await getPool().connect();
    await dbClient.query('BEGIN');
  }

  let nodeStream: Readable | null = null;
  let unzipStream: unzipper.ParseStream | null = null;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NewsToOpportunities/1.0',
      },
    });

    if (res.status === 404) {
      console.warn(`[GDELT Ingestion Warning] File not found at ${targetUrl} (HTTP 404).`);
    } else if (!res.ok || !res.body) {
      throw new Error(`Failed to download GDELT CSV: HTTP ${res.status} ${res.statusText}`);
    } else {
      nodeStream = Readable.fromWeb(res.body as any);
      unzipStream = unzipper.Parse();

      await new Promise<void>((resolve, reject) => {
        let batch: Array<{ event: GdeltEvent; evalRes: RelevanceEvaluation }> = [];
        let isResolved = false;
        let hasProcessedCsv = false;

        const safeResolve = () => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        };

        unzipStream!.on('entry', (entry: unzipper.Entry) => {
          if (entry.type === 'File' && entry.path.toLowerCase().endsWith('.csv')) {
            hasProcessedCsv = true;
            const rl = readline.createInterface({
              input: entry,
              crlfDelay: Infinity,
            });

            let isMaxReached = false;

            rl.on('line', async (line) => {
              if (isMaxReached) return;
              metrics.totalProcessed++;

              if (maxLines > 0 && metrics.totalProcessed >= maxLines) {
                isMaxReached = true;
                rl.close();
                safeResolve();
                return;
              }

              const event = parseGdeltLine(line);
              if (event) {
                const evalRes = evaluateEventRelevance(event, config);
                if (evalRes.isRelevant) {
                  metrics.filteredRelevant++;
                  batch.push({ event, evalRes });

                  if (batch.length >= config.batchSize) {
                    rl.pause();
                    const currentBatch = [...batch];
                    batch = [];

                    if (!isDryRun && dbClient) {
                      try {
                        const resCounts = await withRetry(() => upsertEventBatch(dbClient!, currentBatch));
                        metrics.insertedCount += resCounts.inserted;
                        metrics.updatedCount += resCounts.updated;
                      } catch (err) {
                        metrics.errorCount++;
                        console.error('[GDELT Ingestion] Error during batch upsert:', err);
                      }
                    } else {
                      metrics.insertedCount += currentBatch.length;
                    }

                    rl.resume();
                  }
                }
              }
            });

            rl.on('close', async () => {
              if (batch.length > 0) {
                if (!isDryRun && dbClient) {
                  try {
                    const resCounts = await withRetry(() => upsertEventBatch(dbClient!, batch));
                    metrics.insertedCount += resCounts.inserted;
                    metrics.updatedCount += resCounts.updated;
                  } catch (err) {
                    metrics.errorCount++;
                    console.error('[GDELT Ingestion] Error during final batch upsert:', err);
                  }
                } else {
                  metrics.insertedCount += batch.length;
                }
              }
              safeResolve();
            });
          } else {
            entry.autodrain();
          }
        });

        unzipStream!.on('finish', () => {
          if (!hasProcessedCsv) safeResolve();
        });
        unzipStream!.on('error', (err: any) => {
          if (err?.code === 'ERR_STREAM_PREMATURE_CLOSE' || isResolved) {
            safeResolve();
          } else {
            reject(err);
          }
        });

        nodeStream!.on('error', (err) => {
          if (!isResolved) reject(err);
        });

        nodeStream!.pipe(unzipStream!);
      });
    }

    metrics.durationMs = Date.now() - startTime;

    if (!isDryRun && dbClient) {
      await recordIngestionRun(dbClient, metrics);
      await dbClient.query('COMMIT');
      console.log('[GDELT Ingestion] Transaction committed successfully.');
    }
  } catch (err) {
    if (!isDryRun && dbClient) {
      await dbClient.query('ROLLBACK');
      console.error('[GDELT Ingestion] Transaction rolled back due to error.');
    }
    metrics.errorCount++;
    metrics.durationMs = Date.now() - startTime;
    throw err;
  } finally {
    if (unzipStream) {
      unzipStream.removeAllListeners();
      unzipStream.destroy();
    }
    if (nodeStream) {
      nodeStream.removeAllListeners();
      nodeStream.destroy();
    }
    if (dbClient) {
      dbClient.release();
    }
    await closePool();
  }

  console.log(`\n================ INGESTION METRICS SUMMARY ================`);
  console.log(`Total Events Processed:   ${metrics.totalProcessed}`);
  console.log(`Filtered Relevant Events: ${metrics.filteredRelevant} (${((metrics.filteredRelevant / (metrics.totalProcessed || 1)) * 100).toFixed(2)}%)`);
  console.log(`Inserted Articles:       ${metrics.insertedCount}`);
  console.log(`Updated Articles:        ${metrics.updatedCount}`);
  console.log(`Errors Encountered:      ${metrics.errorCount}`);
  console.log(`Duration (ms):           ${metrics.durationMs}ms`);
  console.log(`============================================================\n`);

  return metrics;
}

// CLI Execution Entrypoint
const isMainModule =
  (typeof require !== 'undefined' && require.main === module) ||
  (Boolean(process.argv[1]) && process.argv[1].includes('ingest-gdelt'));

if (isMainModule) {
  const args = process.argv.slice(2);
  const isDryRunArg = args.includes('--dry-run') || args.includes('-d');
  const dateArg = args.find((arg) => arg.startsWith('--date='))?.split('=')[1];

  (async () => {
    try {
      const targetUrl = dateArg ? await getGdeltExportUrl(dateArg) : undefined;
      await runIngestion({
        dryRun: isDryRunArg,
        urlOverride: targetUrl,
      });
    } catch (err) {
      console.error('[GDELT Ingestion CLI Fatal Error]', err);
      process.exitCode = 1;
    }
  })();
}
