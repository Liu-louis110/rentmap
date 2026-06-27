import type { RoomType, RentType, City, CITIES } from "../types";

interface Props {
  city: City;
  onCityChange: (c: City) => void;
  roomType: RoomType;
  rentType: RentType;
  onRoomTypeChange: (v: RoomType) => void;
  onRentTypeChange: (v: RentType) => void;
}

const roomOptions: { value: RoomType; label: string }[] = [
  { value: "all", label: "全部户型" },
  { value: "1room", label: "一居" },
  { value: "2room", label: "两居" },
  { value: "3room", label: "三居" },
];

const rentOptions: { value: RentType; label: string }[] = [
  { value: "all", label: "不限" },
  { value: "整租", label: "整租" },
  { value: "合租", label: "合租" },
];

export default function FilterBar({ city, onCityChange, roomType, rentType, onRoomTypeChange, onRentTypeChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
      <div className="flex gap-1">
        {CITIES.map((ct) => (
          <button
            key={ct.key}
            onClick={() => onCityChange(ct.key)}
            className={"px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer " + (city === ct.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
          >
            {ct.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200" />
      <span className="text-sm font-medium text-gray-600">租房方式</span>
      <div className="flex gap-1">
        {rentOptions.map((o) => (
          <button
            key={o.value}
            onClick={() => onRentTypeChange(o.value)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
              rentType === o.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <span className="text-sm font-medium text-gray-600 ml-4">户型</span>
      <div className="flex gap-1">
        {roomOptions.map((o) => (
          <button
            key={o.value}
            onClick={() => onRoomTypeChange(o.value)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
              roomType === o.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
        <span className="inline-block w-3 h-3 rounded-sm bg-[#22c55e]" /> &lt;4k
        <span className="inline-block w-3 h-3 rounded-sm bg-[#eab308]" /> 4-7k
        <span className="inline-block w-3 h-3 rounded-sm bg-[#f97316]" /> 7-10k
        <span className="inline-block w-3 h-3 rounded-sm bg-[#ef4444]" /> &gt;10k
      </div>
    </div>
  );
}


