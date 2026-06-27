export interface Community {
  id: string;
  name: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  avgRent: number;
  listings: Listing[];
}

export interface Listing {
  id: string;
  title: string;
  rent: number;
  area: number;
  rooms: string;
  floor: string;
  direction: string;
  community: string;
  images: string[];
  landlordName: string;
  landlordPhone: string;
  landlordWechat?: string;
  description: string;
  tags: string[];
  listedDate: string;
  isElevator: boolean;
  decoration: string;
}

export type RoomType = "all" | "1room" | "2room" | "3room";
export type RentType = "all" | "整租" | "合租";

export interface CompanyLocation {
  name: string;
  lng: number;
  lat: number;
}

export interface CommuteInfo {
  communityId: string;
  duration: number; // minutes
}

export interface CommuteRoute {
  duration: number;
  walking: number;
  transit: string;
  segments: string[];
}

export interface Recommendation {
  community: Community;
  avgRent: number;
  commuteMinutes: number;
  score: number;
  route?: CommuteRoute;
}



export type City = "shanghai" | "nanjing";

export interface CityConfig {
  key: City;
  label: string;
  center: [number, number];
  zoom: number;
  amapCity: string;
}

export const CITIES: CityConfig[] = [
  { key: "shanghai", label: "上海", center: [121.4737, 31.2304], zoom: 11, amapCity: "上海" },
  { key: "nanjing", label: "南京", center: [118.7969, 32.0603], zoom: 11, amapCity: "南京" },
];
