import { PoolClient } from 'pg';
import { getPool } from '../db/index.js';

export interface ArticleRecord {
  id: number;
  source: string;
  source_type?: string;
  source_platform?: string;
  external_id: string;
  title: string | null;
  url: string;
  published_at: Date | string | null;
  country_code: string | null;
  actor_1: string | null;
  actor_2: string | null;
  event_code: string | null;
  goldstein_scale: number | null;
  num_mentions: number;
  avg_tone: number | null;
  relevance_score: number;
  matched_sectors: string[];
  community_comments?: any[];
  cluster_id: number | null;
}

export interface StoryClusterRecord {
  id?: number;
  title: string;
  topic_label: string;
  dominant_sector: string;
  primary_region: string;
  article_count: number;
  source_type?: string;
  articles: ArticleRecord[];
}

export interface ClusteringResult {
  totalUnclusteredProcessed: number;
  clustersCreated: number;
  articlesClustered: number;
  clusters: StoryClusterRecord[];
}

/**
 * Calculates similarity between two articles based on actors, sectors, event code, and 24h time proximity.
 */
export function areArticlesSimilar(a: ArticleRecord, b: ArticleRecord): boolean {
  // 1. Check rolling 24-hour time window proximity
  if (a.published_at && b.published_at) {
    const timeA = new Date(a.published_at).getTime();
    const timeB = new Date(b.published_at).getTime();
    const diffHours = Math.abs(timeA - timeB) / (1000 * 60 * 60);
    if (diffHours > 24) return false;
  }

  // 2. Actor match check (non-generic actors)
  const actorsA = [a.actor_1, a.actor_2].filter((act): act is string => Boolean(act && act.length > 2));
  const actorsB = [b.actor_1, b.actor_2].filter((act): act is string => Boolean(act && act.length > 2));

  const hasSharedActor = actorsA.some((actA) => actorsB.includes(actA));
  if (hasSharedActor) return true;

  // 3. Sector & Event Code similarity
  const sectorsA = a.matched_sectors || [];
  const sectorsB = b.matched_sectors || [];
  const sharedSectors = sectorsA.filter((sec) => sectorsB.includes(sec));

  const codeA = (a.event_code || '').slice(0, 2);
  const codeB = (b.event_code || '').slice(0, 2);
  const hasSameEventCategory = codeA.length > 0 && codeA === codeB;

  const countryA = (a.country_code || '').toUpperCase();
  const countryB = (b.country_code || '').toUpperCase();
  const sameCountry = countryA !== '' && countryA === countryB;

  if (sharedSectors.length >= 2 && (hasSameEventCategory || sameCountry)) {
    return true;
  }

  if (sharedSectors.length >= 1 && hasSameEventCategory && sameCountry) {
    return true;
  }

  return false;
}

/**
 * Derives a human-readable title, topic label, dominant sector, and primary region for a cluster of articles.
 */
export function deriveClusterMetadata(articles: ArticleRecord[]): {
  title: string;
  topic_label: string;
  dominant_sector: string;
  primary_region: string;
} {
  // Sector Frequency Count
  const sectorCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const actorCounts: Record<string, number> = {};

  articles.forEach((art) => {
    (art.matched_sectors || []).forEach((sec) => {
      sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
    });
    if (art.country_code) {
      const cc = art.country_code.toUpperCase();
      countryCounts[cc] = (countryCounts[cc] || 0) + 1;
    }
    if (art.actor_1 && art.actor_1.length > 2) {
      actorCounts[art.actor_1] = (actorCounts[art.actor_1] || 0) + 1;
    }
    if (art.actor_2 && art.actor_2.length > 2) {
      actorCounts[art.actor_2] = (actorCounts[art.actor_2] || 0) + 1;
    }
  });

  const getTopKey = (counts: Record<string, number>, fallback: string) => {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : fallback;
  };

  const dominant_sector = getTopKey(sectorCounts, 'business');
  const primary_region = getTopKey(countryCounts, 'GLOBAL');
  const topActor = getTopKey(actorCounts, '');

  const regionLabel = primary_region === 'GLOBAL' ? 'Global' : primary_region;
  const sectorCapitalized = dominant_sector.charAt(0).toUpperCase() + dominant_sector.slice(1);

  let title = '';
  if (topActor) {
    title = `${topActor} ${sectorCapitalized} & Market Developments (${regionLabel})`;
  } else {
    title = `${sectorCapitalized} Industry Opportunity Signal (${regionLabel})`;
  }

  const topic_label = `${sectorCapitalized} - ${regionLabel}`;

  return { title, topic_label, dominant_sector, primary_region };
}

/**
 * Groups raw unclustered articles in-memory into cohesive clusters.
 */
export function clusterArticles(articles: ArticleRecord[]): StoryClusterRecord[] {
  const visited = new Set<number>();
  const clusters: StoryClusterRecord[] = [];

  for (let i = 0; i < articles.length; i++) {
    const current = articles[i];
    if (visited.has(current.id)) continue;

    const group: ArticleRecord[] = [current];
    visited.add(current.id);

    for (let j = i + 1; j < articles.length; j++) {
      const candidate = articles[j];
      if (visited.has(candidate.id)) continue;

      if (areArticlesSimilar(current, candidate)) {
        group.push(candidate);
        visited.add(candidate.id);
      }
    }

  const metadata = deriveClusterMetadata(group);
    const hasGdelt = group.some((a) => (a.source_type || a.source || 'GDELT').toUpperCase() === 'GDELT');
    const hasHorizon = group.some((a) => (a.source_type || a.source || '').toUpperCase() === 'HORIZON');
    let clusterSourceType = 'GDELT';
    if (hasGdelt && hasHorizon) clusterSourceType = 'HYBRID';
    else if (hasHorizon) clusterSourceType = 'HORIZON';

    clusters.push({
      ...metadata,
      article_count: group.length,
      source_type: clusterSourceType,
      articles: group,
    });
  }

  return clusters;
}

/**
 * Fetches unclustered articles from PostgreSQL, groups them into clusters, and updates the database.
 */
export async function runClusteringPipeline(options?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<ClusteringResult> {
  const isDryRun = options?.dryRun ?? false;
  const limit = options?.limit || 1000;

  let unclusteredArticles: ArticleRecord[] = [];

  if (!isDryRun) {
    const pool = getPool();
    const queryRes = await pool.query<ArticleRecord>(
      `SELECT * FROM articles
       WHERE cluster_id IS NULL
         AND (published_at >= NOW() - INTERVAL '24 hours' OR published_at IS NULL)
       ORDER BY relevance_score DESC, published_at DESC LIMIT $1`,
      [limit]
    );
    unclusteredArticles = queryRes.rows;
  }

  if (unclusteredArticles.length === 0 && !isDryRun) {
    console.log('[Clustering Service] No unclustered articles found.');
    return {
      totalUnclusteredProcessed: 0,
      clustersCreated: 0,
      articlesClustered: 0,
      clusters: [],
    };
  }

  const clusters = clusterArticles(unclusteredArticles);

  if (!isDryRun) {
    const client: PoolClient = await getPool().connect();
    try {
      await client.query('BEGIN');

      for (const cluster of clusters) {
        // Insert cluster record
        const clusterRes = await client.query(
          `INSERT INTO story_clusters (title, topic_label, dominant_sector, primary_region, article_count, source_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id;`,
          [cluster.title, cluster.topic_label, cluster.dominant_sector, cluster.primary_region, cluster.article_count, cluster.source_type || 'GDELT']
        );

        const newClusterId = clusterRes.rows[0].id;
        cluster.id = newClusterId;

        const articleIds = cluster.articles.map((a) => a.id);
        if (articleIds.length > 0) {
          await client.query(
            `UPDATE articles SET cluster_id = $1 WHERE id = ANY($2::int[]);`,
            [newClusterId, articleIds]
          );
        }
      }

      await client.query('COMMIT');
      console.log(`[Clustering Service] Persisted ${clusters.length} story clusters to database.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Clustering Service] Transaction rolled back due to error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  const totalClusteredArticles = clusters.reduce((acc, c) => acc + c.articles.length, 0);

  return {
    totalUnclusteredProcessed: unclusteredArticles.length,
    clustersCreated: clusters.length,
    articlesClustered: totalClusteredArticles,
    clusters,
  };
}
