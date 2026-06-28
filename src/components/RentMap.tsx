import { useEffect, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import type { Community, RoomType, RentType, CompanyLocation } from "../types";

interface Props {
  communities: Community[];
  roomType: RoomType;
  rentType: RentType;
  onSelect: (c: Community) => void;
  selectedId: string | null;
  company: CompanyLocation | null;
  recommendedIds: string[];
  onMapDblClick?: (lng: number, lat: number) => void;
  mapCenter?: [number, number];
  mapZoom?: number;
}

function getFilteredAvg(c: Community, roomType: RoomType, rentType: RentType): number {
  let filtered = c.listings;
  if (rentType !== "all") {
    filtered = filtered.filter((l) =>
      rentType === "\u5408\u79df" ? l.rooms.startsWith("1\u5ba4") && l.rent < 3000 : !l.rooms.startsWith("1\u5ba4") || l.rent >= 3000
    );
  }
  if (roomType !== "all") {
    const n = parseInt(roomType);
    filtered = filtered.filter((l) => l.rooms.startsWith(n + "\u5ba4"));
  }
  if (filtered.length === 0) return 0;
  return Math.round(filtered.reduce((s, l) => s + l.rent, 0) / filtered.length);
}

function rentColor(avg: number): string {
  if (avg === 0) return "#9ca3af";
  if (avg < 4000) return "#22c55e";
  if (avg < 7000) return "#eab308";
  if (avg < 10000) return "#f97316";
  return "#ef4444";
}

// Grid-based clustering: merge nearby communities at low zoom levels
function clusterCommunities(
  communities: Community[],
  roomType: RoomType,
  rentType: RentType,
  zoom: number
): { c: Community; count: number; avg: number; isCluster: boolean }[] {
  if (zoom >= 12) {
    // No clustering at high zoom
    return communities.map((c) => ({
      c,
      count: 1,
      avg: getFilteredAvg(c, roomType, rentType),
      isCluster: false,
    }));
  }

  // Grid cell size based on zoom level
  const cellDeg = zoom <= 10 ? 0.045 : 0.025;

  const grid = new Map<string, { communities: Community[]; sumLat: number; sumLng: number; totalAvg: number; count: number }>();

  communities.forEach((c) => {
    const avg = getFilteredAvg(c, roomType, rentType);
    const cellKey = Math.floor(c.lat / cellDeg) + "_" + Math.floor(c.lng / cellDeg);
    if (!grid.has(cellKey)) {
      grid.set(cellKey, { communities: [], sumLat: 0, sumLng: 0, totalAvg: 0, count: 0 });
    }
    const cell = grid.get(cellKey)!;
    cell.communities.push(c);
    cell.sumLat += c.lat;
    cell.sumLng += c.lng;
    cell.totalAvg += avg;
    cell.count++;
  });

  const result: { c: Community; count: number; avg: number; isCluster: boolean }[] = [];

  grid.forEach((cell) => {
    if (cell.count === 1) {
      const comm = cell.communities[0];
      result.push({
        c: comm,
        count: 1,
        avg: getFilteredAvg(comm, roomType, rentType),
        isCluster: false,
      });
    } else {
      const avgRent = Math.round(cell.totalAvg / cell.count);
      // Use the first community as the "representative" but rename it
      const rep = cell.communities[0];
      const clusterComm: Community = {
        ...rep,
        name: cell.communities.length + "\u4e2a\u5c0f\u533a",
        lat: cell.sumLat / cell.count,
        lng: cell.sumLng / cell.count,
        avgRent,
      };
      result.push({
        c: clusterComm,
        count: cell.count,
        avg: avgRent,
        isCluster: true,
      });
    }
  });

  return result;
}

export default function RentMap({
  communities, roomType, rentType, onSelect, selectedId, company, recommendedIds, onMapDblClick, mapCenter, mapZoom
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoRef = useRef<any>(null);
  const companyMarkerRef = useRef<any>(null);
  const onMapDblClickRef = useRef(onMapDblClick);
  onMapDblClickRef.current = onMapDblClick;
  const [zoom, setZoom] = useState(11);

  useEffect(() => {
    let map: any;
    let AMapInstance: any;
    // 高德地图安全配置
    window._AMapSecurityConfig = {
      securityJsCode: "e5770854d498ff0c08e37b639d2356bd",
    };
    AMapLoader.load({
      key: "f5c468f7fe09be907559b3f62fa9259a",
      version: "2.0",
      securityJsCode: "e5770854d498ff0c08e37b639d2356bd",
      plugins: ["AMap.Scale", "AMap.ToolBar", "AMap.Transfer", "AMap.PlaceSearch"],
    })
      .then((AMap) => {
        if (!containerRef.current) return;
        AMapInstance = AMap;
        map = new AMap.Map(containerRef.current, {
          zoom: 11,
          center: [121.4737, 31.2304],
          mapStyle: "amap://styles/whitesmoke",
        });
        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: "RT" }));

        // Listen for zoom changes
        map.on("zoomend", () => {
          const newZoom = map.getZoom();
          setZoom(newZoom);
        });

        map.on("dblclick", (e: any) => {
          const lng = e.lnglat.getLng();
          const lat = e.lnglat.getLat();
          console.log("[租房地图] Map double-click at:", lng, lat);
          if (onMapDblClickRef.current) {
            onMapDblClickRef.current(lng, lat);
          }
        });

        mapRef.current = map;
        updateMarkers(AMap, map);
      })
      .catch((e) => console.error("AMap load failed:", e));

    return () => { map?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center map when city changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapCenter) return;
    map.setZoomAndCenter(mapZoom || 11, mapCenter);
  }, [mapCenter, mapZoom]);

  useEffect(() => {
    const AMap = (window as any).AMap;
    if (!AMap || !mapRef.current) return;

    // Recompute clustered data when zoom changes
    const currentZoom = mapRef.current.getZoom();
    
    mapRef.current.setStatus({ doubleClickZoom: false });
    updateMarkers(AMap, mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communities, roomType, rentType, selectedId, company, recommendedIds, zoom]);

  function updateMarkers(AMap: any, map: any) {
    markersRef.current.forEach((m) => map.remove(m));
    markersRef.current = [];

    // company marker
    if (companyMarkerRef.current) {
      map.remove(companyMarkerRef.current);
      companyMarkerRef.current = null;
    }
    if (company) {
      const cm = new AMap.Marker({
        position: new AMap.LngLat(company.lng, company.lat),
        content: ['<div style="background:#2563eb;color:#fff;font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;white-space:nowrap;box-shadow:0 3px 12px rgba(37,99,235,0.5);border:3px solid #fff;transform:translate(-50%,-100%);cursor:pointer;">',
          "\u516c\u53f8: ", company.name,
        '</div>'].join(""),
        zIndex: 200,
      });
      map.add(cm);
      companyMarkerRef.current = cm;
    }

    // Get current zoom level
    const currentZoom = map.getZoom();
    const clustered = clusterCommunities(communities, roomType, rentType, currentZoom);

    clustered.forEach((item) => {
      const { c, avg, count, isCluster } = item;
      const color = rentColor(avg);
      const isSelected = c.id === selectedId;
      const isRecommended = recommendedIds.includes(c.id);
      const size = isSelected ? 46 : isRecommended ? 40 : isCluster ? 44 : 34;

      let borderStyle = isCluster ? "2px dashed rgba(255,255,255,0.9)" : "2px solid rgba(255,255,255,0.8)";
      let zIndex = 10;
      let bgStyle = isCluster ? "background:linear-gradient(135deg," + color + "," + color + "cc);" : "background:" + color + ";";

      if (isSelected) { borderStyle = "3px solid #1d4ed8"; zIndex = 100; }
      else if (isRecommended) { borderStyle = "3px solid #f59e0b"; zIndex = 50; }

      const fontSize = isSelected || isRecommended ? 12 : isCluster ? 11 : 11;
      const label = avg > 0 ? (isCluster ? "\u2248" + (avg / 1000).toFixed(1) + "k" : (avg / 1000).toFixed(1) + "k") : "\u65e0\u6570\u636e";

      const marker = new AMap.Marker({
        position: new AMap.LngLat(c.lng, c.lat),
        content: '<div style="' +
          bgStyle +
          'color:#fff;' +
          'font-size:' + fontSize + 'px;' +
          'font-weight:600;' +
          'padding:4px 8px;' +
          'border-radius:6px;' +
          'white-space:nowrap;' +
          'box-shadow:0 2px 8px rgba(0,0,0,0.25);' +
          'border:' + borderStyle + ';' +
          'transform:translate(-50%,-100%);' +
          'cursor:pointer;' +
          'min-width:' + size + 'px;' +
          'text-align:center;' +
        '">' + label + '</div>',
        offset: new AMap.Pixel(0, 0),
        zIndex,
      });

      marker.on("click", () => {
        if (isCluster) {
          // Zoom in to expand cluster
          map.setZoomAndCenter(currentZoom + 2, [c.lng, c.lat]);
        } else {
          onSelect(c);
          infoRef.current?.close();
          const info = new AMap.InfoWindow({
            content: '<div style="padding:8px 12px;min-width:160px;">' +
              '<div style="font-weight:600;font-size:14px;margin-bottom:4px;">' + c.name + '</div>' +
              '<div style="font-size:12px;color:#666;">' + c.district + ' \u00b7 \u5747\u4ef7 \u00a5' + avg + '/\u6708</div>' +
              '<div style="font-size:12px;color:#666;">' + c.listings.length + ' \u5957\u5728\u79df</div>' +
            '</div>',
            offset: new AMap.Pixel(0, -10),
            closeWhenClickMap: true,
          });
          info.open(map, marker.getPosition());
          infoRef.current = info;
        }
      });

      map.add(marker);
      markersRef.current.push(marker);
    });
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
