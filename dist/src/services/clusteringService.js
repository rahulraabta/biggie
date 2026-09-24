"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areArticlesSimilar = areArticlesSimilar;
exports.deriveClusterMetadata = deriveClusterMetadata;
exports.clusterArticles = clusterArticles;
exports.runClusteringPipeline = runClusteringPipeline;
const index_js_1 = require("../db/index.js");
/**
 * Calculates similarity between two articles based on actors, sectors, event code, and 24h time proximity.
 */
function areArticlesSimilar(a, b) {
    // 1. Check rolling 24-hour time window proximity
    if (a.published_at && b.published_at) {
        const timeA = new Date(a.published_at).getTime();
        const timeB = new Date(b.published_at).getTime();
        const diffHours = Math.abs(timeA - timeB) / (1000 * 60 * 60);
        if (diffHours > 24)
            return false;
    }
    // 2. Actor match check (non-generic actors)
    const actorsA = [a.actor_1, a.actor_2].filter((act) => Boolean(act && act.length > 2));
    const actorsB = [b.actor_1, b.actor_2].filter((act) => Boolean(act && act.length > 2));
    const hasSharedActor = actorsA.some((actA) => actorsB.includes(actA));
    if (hasSharedActor)
        return true;
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
function deriveClusterMetadata(articles) {
    // Sector Frequency Count
    const sectorCounts = {};
    const countryCounts = {};
    const actorCounts = {};
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
    const getTopKey = (counts, fallback) => {
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
    }
    else {
        title = `${sectorCapitalized} Industry Opportunity Signal (${regionLabel})`;
    }
    const topic_label = `${sectorCapitalized} - ${regionLabel}`;
    return { title, topic_label, dominant_sector, primary_region };
}
/**
 * Groups raw unclustered articles in-memory into cohesive clusters.
 */
function clusterArticles(articles) {
    const visited = new Set();
    const clusters = [];
    for (let i = 0; i < articles.length; i++) {
        const current = articles[i];
        if (visited.has(current.id))
            continue;
        const group = [current];
        visited.add(current.id);
        for (let j = i + 1; j < articles.length; j++) {
            const candidate = articles[j];
            if (visited.has(candidate.id))
                continue;
            if (areArticlesSimilar(current, candidate)) {
                group.push(candidate);
                visited.add(candidate.id);
            }
        }
        const metadata = deriveClusterMetadata(group);
        clusters.push({
            ...metadata,
            article_count: group.length,
            articles: group,
        });
    }
    return clusters;
}
/**
 * Fetches unclustered articles from PostgreSQL, groups them into clusters, and updates the database.
 */
async function runClusteringPipeline(options) {
    const isDryRun = options?.dryRun ?? false;
    const limit = options?.limit || 1000;
    let unclusteredArticles = [];
    if (!isDryRun) {
        const pool = (0, index_js_1.getPool)();
        const queryRes = await pool.query(`SELECT * FROM articles WHERE cluster_id IS NULL ORDER BY relevance_score DESC, published_at DESC LIMIT $1`, [limit]);
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
        const client = await (0, index_js_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            for (const cluster of clusters) {
                // Insert cluster record
                const clusterRes = await client.query(`INSERT INTO story_clusters (title, topic_label, dominant_sector, primary_region, article_count)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id;`, [cluster.title, cluster.topic_label, cluster.dominant_sector, cluster.primary_region, cluster.article_count]);
                const newClusterId = clusterRes.rows[0].id;
                cluster.id = newClusterId;
                const articleIds = cluster.articles.map((a) => a.id);
                if (articleIds.length > 0) {
                    await client.query(`UPDATE articles SET cluster_id = $1 WHERE id = ANY($2::int[]);`, [newClusterId, articleIds]);
                }
            }
            await client.query('COMMIT');
            console.log(`[Clustering Service] Persisted ${clusters.length} story clusters to database.`);
        }
        catch (err) {
            await client.query('ROLLBACK');
            console.error('[Clustering Service] Transaction rolled back due to error:', err);
            throw err;
        }
        finally {
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
