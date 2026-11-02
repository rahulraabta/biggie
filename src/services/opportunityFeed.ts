import type { OpportunityResponseItem } from '../../app/api/opportunities/route';
import { getPinCoordinates } from '../utils/geoUtils';

export const OPPORTUNITY_SELECT_SQL = `
  SELECT o.id, o.cluster_id, o.type, o.title, o.short_description, o.long_description,
    o.core_problem, o.detailed_problem_breakdown, o.case_example, o.actionable_venture_model,
    o.specific_catalysts, o.feasibility_score, o.impact_score, o.time_to_market_score,
    o.probability_score, o.band, o.risks, o.assumptions, o.source_count, o.created_at, o.updated_at,
    c.title AS cluster_title, c.dominant_sector, c.primary_region,
    COALESCE(c.dominant_sector, 'General') AS sector,
    COALESCE(c.primary_region, 'Global') AS region,
    (SELECT AVG(a.goldstein_scale) FROM articles a WHERE a.cluster_id = c.id) AS goldstein_delta
  FROM opportunities o LEFT JOIN story_clusters c ON o.cluster_id = c.id
  WHERE 1=1
`;

export function enrichOpportunity(row: OpportunityResponseItem): OpportunityResponseItem {
  const pin = getPinCoordinates(row.primary_region || 'GLOBAL');
  return { ...row, latitude: pin.lat, longitude: pin.lng };
}
