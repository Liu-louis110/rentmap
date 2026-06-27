import type { Community, City } from "../types";
import { mockCommunities as rawShanghai } from "./mockData";
import { nanjingCommunities } from "./mockDataNanjing";

// Ensure backward compatibility: add city field to old Shanghai data
const shanghaiCommunities: Community[] = rawShanghai.map(c => ({
  ...c,
  city: 'shanghai' as City,
}));

const communitiesMap: Record<City, Community[]> = {
  shanghai: shanghaiCommunities,
  nanjing: nanjingCommunities,
};

export function getCommunitiesByCity(city: City): Community[] {
  return communitiesMap[city] || communitiesMap['shanghai'];
}
