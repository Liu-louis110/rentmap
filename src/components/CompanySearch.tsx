import { useState, useRef, useEffect } from "react";
import type { CompanyLocation } from "../types";

interface Props {
  onCompanySelect: (loc: CompanyLocation) => void;
  company: CompanyLocation | null;
  onClear: () => void;
}

const AMAP_KEY = "5fc1d82d6d5a2138787e6814da0fcc89";

const LOCAL_PLACES = [
  { n: "人民广场", lng: 121.4737, lat: 31.2304 },
  { n: "南京西路", lng: 121.4560, lat: 31.2280 },
  { n: "南京东路", lng: 121.4780, lat: 31.2380 },
  { n: "陆家嘴", lng: 121.5050, lat: 31.2400 },
  { n: "静安寺", lng: 121.4480, lat: 31.2230 },
  { n: "徐家汇", lng: 121.4370, lat: 31.1950 },
  { n: "五角场", lng: 121.5120, lat: 31.3000 },
  { n: "中山公园", lng: 121.4160, lat: 31.2190 },
  { n: "虹桥火车站", lng: 121.3300, lat: 31.1950 },
  { n: "上海火车站", lng: 121.4560, lat: 31.2510 },
  { n: "上海南站", lng: 121.4330, lat: 31.1540 },
  { n: "虹桥机场", lng: 121.3360, lat: 31.1980 },
  { n: "浦东机场", lng: 121.8050, lat: 31.1450 },
  { n: "张江高科", lng: 121.6050, lat: 31.2050 },
  { n: "漕河泾", lng: 121.4000, lat: 31.1700 },
  { n: "世纪大道", lng: 121.5220, lat: 31.2380 },
  { n: "外滩", lng: 121.4900, lat: 31.2400 },
  { n: "上海体育馆", lng: 121.4380, lat: 31.1800 },
  { n: "莘庄", lng: 121.3800, lat: 31.1100 },
  { n: "七宝", lng: 121.3500, lat: 31.1600 },
  { n: "松江新城", lng: 121.2300, lat: 31.0300 },
  { n: "嘉定新城", lng: 121.2500, lat: 31.3400 },
  { n: "川沙", lng: 121.7000, lat: 31.1800 },
  { n: "北外滩", lng: 121.4750, lat: 31.2600 },
  { n: "杨浦", lng: 121.5280, lat: 31.2600 },
  { n: "黄浦", lng: 121.4900, lat: 31.2200 },
  { n: "长宁", lng: 121.4200, lat: 31.2200 },
  { n: "普陀", lng: 121.4100, lat: 31.2400 },
  { n: "闵行", lng: 121.3800, lat: 31.1100 },
  { n: "宝山", lng: 121.4800, lat: 31.4000 },
  { n: "浦东", lng: 121.5400, lat: 31.2200 },
  { n: "新天地", lng: 121.4780, lat: 31.2180 },
  { n: "陆家嘴", lng: 121.5050, lat: 31.2420 },
  { n: "复兴公园", lng: 121.4570, lat: 31.2100 },
  { n: "太古里", lng: 121.4600, lat: 31.2250 },
];

export default function CompanySearch({ onCompanySelect, company, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ n: string; addr: string; lng: number; lat: number }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function searchLocal(keyword: string) {
    const kw = keyword.toLowerCase();
    const results = LOCAL_PLACES.filter(
      (p) => p.n.includes(keyword) || p.n.toLowerCase().includes(kw)
    );
    if (results.length > 0) {
      const s = results.slice(0, 10).map((p) => ({
        n: p.n,
        addr: "上海市",
        lng: p.lng,
        lat: p.lat,
      }));
      setSuggestions(s);
      setShowDropdown(true);
      return s;
    }
    return [] as { n: string; addr: string; lng: number; lat: number }[];
  }

  async function searchAMap(keyword: string) {
    if (keyword.trim().length < 1) return;
    setLoading(true);
    setError("");
    try {
      const url =
        "/amap/v3/place/text?key=" +
        AMAP_KEY +
        "&keywords=" +
        encodeURIComponent(keyword) +
        "&city=" +
        encodeURIComponent("上海") +
        "&offset=10&extensions=base";
      const resp = await fetch(url);
      const data = await resp.json();
      setLoading(false);
      if (data && data.status === "1" && data.pois && data.pois.length > 0) {
        const s = data.pois.slice(0, 10).map((p: any) => ({
          n: p.name,
          addr: [p.pname, p.cityname, p.adname, p.address].filter(Boolean).join(" "),
          lng: parseFloat(p.location.split(",")[0]),
          lat: parseFloat(p.location.split(",")[1]),
        }));
        setSuggestions(s);
        setShowDropdown(true);
        return;
      }
    } catch (e) {
      console.warn("AMap API error:", e);
    }
    setLoading(false);
    // Fallback to local
    const local = searchLocal(keyword);
    if (local.length === 0) {
      setError("未找到匹配的地点，请尝试其他关键词");
    }
  }

  function handleSearch(value: string) {
    setQuery(value);
    setError("");
    if (value.trim().length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    // Immediate local search
    const local = searchLocal(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchAMap(value);
    }, 300);
  }

  function handleSelect(loc: { n: string; addr: string; lng: number; lat: number }) {
    console.log("[租房地图] Location selected:", loc.n, loc.addr);
    onCompanySelect({
      name: loc.n + (loc.addr !== "上海市" ? " (" + loc.addr + ")" : ""),
      lng: loc.lng,
      lat: loc.lat,
    });
    setQuery(loc.n);
    setShowDropdown(false);
    setError("");
  }

  if (company) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
        <span className="text-sm font-medium text-green-800 truncate max-w-[160px]">{company.name}</span>
        <button
          onClick={() => {
            onClear();
            setQuery("");
            setError("");
          }}
          className="text-green-600 hover:text-green-800 text-xs ml-1 cursor-pointer"
        >
          清除
        </button>
      </div>
    );
  }

  const searchable = query.trim().length > 0;

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-1">
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && searchable) {
            if (suggestions.length > 0) handleSelect(suggestions[0]);
            else searchAMap(query);
          }
        }}
        placeholder="输入公司地址搜索..."
        className="w-52 px-3 py-2 text-sm border border-gray-300 rounded-l-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <button
        onClick={() => {
          if (suggestions.length > 0) handleSelect(suggestions[0]);
          else if (searchable) searchAMap(query);
        }}
        disabled={!searchable}
        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
      >
        搜索
      </button>

      {loading && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-12 flex items-center justify-center">
          <span className="text-xs text-blue-500 animate-pulse py-2">搜索中...</span>
        </div>
      )}

      {error && !loading && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-red-200 z-50 p-3">
          <span className="text-xs text-red-500">{error}</span>
        </div>
      )}

      {!loading && !error && showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
          {suggestions.map((loc, i) => (
            <div
              key={i}
              onClick={() => handleSelect(loc)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
            >
              <div className="text-sm font-medium text-gray-800">{loc.n}</div>
              <div className="text-xs text-gray-400 truncate">{loc.addr}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
