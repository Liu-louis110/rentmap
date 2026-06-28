﻿import { useState, useMemo, useCallback, useEffect } from "react";
import RentMap from "./components/RentMap";
import FilterBar from "./components/FilterBar";
import DetailPanel from "./components/DetailPanel";
import CompanySearch from "./components/CompanySearch";
import RecommendationPanel from "./components/RecommendationPanel";
import { getCommunitiesByCity } from "./data/index";
import type { Community, RoomType, RentType, CompanyLocation, Recommendation, CommuteRoute, City } from "./types";
import { CITIES } from "./types";
import "./App.css";

function App() {
  const [roomType, setRoomType] = useState<RoomType>("all");
  const [rentType, setRentType] = useState<RentType>("all");
  const [selected, setSelected] = useState<Community | null>(null);
  const [city, setCity] = useState<City>("shanghai");
  const [company, setCompany] = useState<CompanyLocation | null>(null);
  const [commuteMap, setCommuteMap] = useState<Record<string, number>>({});
  const [loadingCommute, setLoadingCommute] = useState(false);
  const [commuteProgress, setCommuteProgress] = useState(0);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [routeDetails, setRouteDetails] = useState<Record<string, CommuteRoute>>({});
  const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || "f5c468f7fe09be907559b3f62fa9259a";
const WEB_AMAP_KEY = "5fc1d82d6d5a2138787e6814da0fcc89";

  // Calculate commute using Haversine formula
  const calcCommute = (loc: CompanyLocation) => {
    console.log("【\u6613\u79df】 calcCommute called with:", loc.name);
    setLoadingCommute(true);
    setCommuteProgress(0);
    const results: Record<string, number> = {};
    const lat1 = (loc.lat * Math.PI) / 180;
    const lng1 = (loc.lng * Math.PI) / 180;
    getCommunitiesByCity(city).forEach((c) => {
      const lat2 = (c.lat * Math.PI) / 180;
      const lng2 = (c.lng * Math.PI) / 180;
      const dlat = lat2 - lat1;
      const dlng = lng2 - lng1;
      const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) ** 2;
      const dist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const walkTime = (dist * 0.3) / 80;
      const transitTime = (dist * 0.7) / 350;
      const totalMinutes = Math.round(walkTime + transitTime + 8);
      results[c.id] = Math.max(5, totalMinutes);
    });
    console.log("【\u6613\u79df】 commuteMap set:", Object.keys(results).length, "communities");
    setCommuteMap({ ...results });
    setLoadingCommute(false);
    setCommuteProgress(100);
  };

  // Fetch transit route via AMap Web API
  const fetchRoute = async (fromLng: number, fromLat: number, toLng: number, toLat: number, destName: string, amapCity?: string): Promise<CommuteRoute | null> => {
    // Retry loop: wait for AMap Transfer plugin to be ready (up to 4.5s)
    for (let retry = 0; retry < 15; retry++) {
      try {
      const amap = (window as any).AMap;
      if (amap && amap.Transfer) {
        const routeResult = await new Promise<CommuteRoute | null>((resolve) => {
          const transfer = new amap.Transfer({
            city: amapCity || "上海",
            policy: 0,
          });
          transfer.search(
            new amap.LngLat(fromLng, fromLat),
            new amap.LngLat(toLng, toLat),
            (status: string, result: any) => {
            if (status === "complete" && result.info?.toLowerCase() === "ok" && result.plans && result.plans.length > 0) {
              const plan = result.plans[0];
              const routeSegments: string[] = [];
              let totalWalking = 0;
              (plan.segments || []).forEach((seg: any) => {
                if (seg.bus && seg.bus.buslines && seg.bus.buslines.length > 0) {
                  const bl = seg.bus.buslines[0];
                  const type = bl.type === "地铁线路" ? "地铁" : "公交";
                  routeSegments.push(type + bl.name + "(" + bl.departure_stop.name + "-" + bl.arrival_stop.name + ")");
                } else if (seg.instruction) {
                  routeSegments.push(seg.instruction);
                }
                if (seg.walking && seg.walking.distance) {
                  totalWalking += seg.walking.distance;
                }
              });
              resolve({
                duration: Math.round(plan.duration / 60),
                walking: Math.round(totalWalking / 60),
                transit: routeSegments.join(" > ") || "直接步行",
                segments: routeSegments,
              });
            } else {
              resolve(null);
            }
          });
        });
        if (routeResult) return routeResult;
        break;
      }
    } catch (e) {
      break;
    }
    await new Promise((r) => setTimeout(r, 300));
    }
    console.warn("AMap Transfer unavailable, trying REST API");
    // Fallback: REST API via proxy (local dev)
    try {
      const params = new URLSearchParams({
        key: WEB_AMAP_KEY,
        origin: fromLng + "," + fromLat,
        destination: toLng + "," + toLat,
        city: amapCity || "上海",
        cityd: amapCity || "上海",
        strategy: "0",
        extensions: "all",
      });
      const url = "https://restapi.amap.com/v3/direction/transit/integrated?" + params.toString();
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.status === "1" && data.route && data.route.transits && data.route.transits.length > 0) {
        const t = data.route.transits[0];
        const segments: string[] = [];
        let totalWalking = 0;
        (t.segments || []).forEach((seg: any) => {
          if (seg.bus && seg.bus.buslines && seg.bus.buslines.length > 0) {
            const bl = seg.bus.buslines[0];
            const type = bl.type === "地铁线路" ? "地铁" : "公交";
            segments.push(type + bl.name + "(" + bl.departure_stop.name + "-" + bl.arrival_stop.name + ")");
          } else if (seg.walking) {
            totalWalking += seg.walking.distance || 0;
          } else if (seg.railway) {
            segments.push("铁路" + (seg.railway.name || ""));
          }
        });
        return {
          duration: Math.round(t.duration / 60),
          walking: Math.round(totalWalking / 60),
          transit: segments.join(" > ") || "直接步行",
          segments,
        };
      }
    } catch (e) {
      console.warn("Route fetch failed for", destName, e);
    }
    return null;
  };

const communities = useMemo(() => {
    return getCommunitiesByCity(city).map((c) => {
      let filtered = c.listings;
      if (rentType !== "all") {
        filtered = filtered.filter((l) =>
          rentType === "合租"
            ? l.rooms.startsWith("1室") && l.rent < 3000
            : !l.rooms.startsWith("1室") || l.rent >= 3000
        );
      }
      if (roomType !== "all") {
        const n = parseInt(roomType);
        filtered = filtered.filter((l) => l.rooms.startsWith(n + "室"));
      }
      return {
        ...c,
        avgRent: filtered.length > 0 ? Math.round(filtered.reduce((s, l) => s + l.rent, 0) / filtered.length) : 0,
      };
    });
  }, [city, roomType, rentType]);

  const recommendations = useMemo((): Recommendation[] => {
    if (!company || Object.keys(commuteMap).length === 0) {
      return [];
    }
    const valid = communities.filter((c) => c.avgRent > 0 && commuteMap[c.id] != null);
    if (valid.length === 0) return [];

    const rents = valid.map((c) => c.avgRent);
    const times = valid.map((c) => commuteMap[c.id]);
    const minRent = Math.min(...rents);
    const maxRent = Math.max(...rents);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const rentRange = maxRent - minRent || 1;
    const timeRange = maxTime - minTime || 1;

    const scored = valid.map((c) => {
      const normRent = (c.avgRent - minRent) / rentRange;
      const normTime = (commuteMap[c.id] - minTime) / timeRange;
      const commutePenalty = commuteMap[c.id] > 45 ? (commuteMap[c.id] - 45) * 0.5 : 0;
      const score = 100 - (normRent * 50 + normTime * 50) - commutePenalty;
      return {
        community: c,
        avgRent: c.avgRent,
        commuteMinutes: commuteMap[c.id],
        score,
        route: routeDetails[c.id],
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, 5);
    console.log("【\u6613\u79df】 top:", top5.map(r => r.community.name + " " + r.commuteMinutes + "min"));
    return top5;
  }, [company, communities, commuteMap, routeDetails]);

  const recommendedIds = useMemo(() => recommendations.map((r) => r.community.id), [recommendations]);

  // Fetch route details when recommendations change
  useEffect(() => {
    if (!company || recommendations.length === 0) return;
    recommendations.forEach((r) => {
      if (!routeDetails[r.community.id]) {
        const amapCity = CITIES.find(c => c.key === city)?.amapCity || "上海";
        fetchRoute(company.lng, company.lat, r.community.lng, r.community.lat, r.community.name, amapCity).then((route) => {
          if (route) {
            setRouteDetails((prev) => ({ ...prev, [r.community.id]: route }));
          }
        });
      }
    });
  }, [recommendations, company]);

  const handleCityChange = (newCity: City) => {
    setCity(newCity);
    setCompany(null);
    setCommuteMap({});
    setRouteDetails({});
    setSelected(null);
    setShowRecommendations(true);
  };

  const handleCompanySelect = (loc: CompanyLocation) => {
    setShowRecommendations(true);
    console.log("【\u6613\u79df】 company:", loc.name, loc.lat, loc.lng);
    setCompany(loc);
    setCommuteMap({});
    setTimeout(() => {
      calcCommute(loc);
    }, 50);
  };

  const handleCompanyClear = () => {
    setCompany(null);
    setCommuteMap({});
  };

  // Handle map double-click to set company location
  const handleMapDblClick = (lng: number, lat: number) => {
    const loc: CompanyLocation = {
      name: lat.toFixed(4) + ", " + lng.toFixed(4),
      lng,
      lat,
    };
    handleCompanySelect(loc);
  };

  return (
    <div className="flex flex-col h-screen w-screen">
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">
          租
        </div>
        <h1 className="text-base font-bold text-gray-900 shrink-0">{CITIES.find(c => c.key === city)?.label || "上海"}\u6613\u79df</h1>
        <div className="flex-1" />
        <CompanySearch onCompanySelect={handleCompanySelect} company={company} onClear={handleCompanyClear} city={city} />

        {loadingCommute && (
          <div className="flex items-center gap-2 text-xs text-blue-500">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            计算通勤中... {commuteProgress}%
          </div>
        )}

        <div className="text-[10px] text-gray-400 leading-tight text-right ml-1">
          <div>双击地图任意位置</div>
          <div>设为公司地址</div>
        </div>
      </header>

      <FilterBar
        city={city}
        onCityChange={handleCityChange}
        roomType={roomType}
        rentType={rentType}
        onRoomTypeChange={setRoomType}
        onRentTypeChange={setRentType}
      />

      <div className="flex-1 relative">
        <RentMap
          communities={communities}
          roomType={roomType}
          rentType={rentType}
          onSelect={setSelected}
          selectedId={selected?.id ?? null}
          company={company}
          recommendedIds={recommendedIds}
          onMapDblClick={handleMapDblClick}
          mapCenter={CITIES.find(c => c.key === city)?.center}
          mapZoom={CITIES.find(c => c.key === city)?.zoom}
        />
        {showRecommendations && recommendations.length > 0 && (
          <RecommendationPanel
            recommendations={recommendations}
            onSelect={(id) => {
              const c = communities.find((x) => x.id === id);
              if (c) setSelected(c);
            }}
            selectedId={selected?.id ?? null}
            companyName={company?.name ?? ""}
            onClose={() => setShowRecommendations(false)}
          />
        )}
        {company && !loadingCommute && Object.keys(commuteMap).length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-700 z-50 shadow-lg">
            正在准备通勤计算，请稍候...
          </div>
        )}
        <DetailPanel community={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}

export default App;




