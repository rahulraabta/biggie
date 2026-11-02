import type { OpportunityResponseItem } from '../../app/api/opportunities/route';

export function applyOpportunitySnapshot(previousIds: Set<number> | null, incoming: OpportunityResponseItem[], live: boolean) {
  const unique = [...new Map(incoming.map((opportunity) => [opportunity.id, opportunity])).values()];
  const newIds = live && previousIds ? unique.filter((item) => !previousIds.has(item.id)).map((item) => item.id) : [];
  const added = new Set(newIds);
  return {
    opportunities: newIds.length ? [...unique.filter((item) => added.has(item.id)), ...unique.filter((item) => !added.has(item.id))] : unique,
    newIds,
  };
}
