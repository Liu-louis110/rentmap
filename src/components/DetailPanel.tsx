import { useState } from "react";
import type { Community, Listing } from "../types";
import ListingDetailModal from "./ListingDetailModal";

interface Props {
  community: Community | null;
  onClose: () => void;
}

export default function DetailPanel({ community, onClose }: Props) {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  if (!community) return null;

  return (
    <>
      <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">{community.name}</h2>
            <p className="text-xs text-gray-500">{community.district}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="text-2xl font-bold text-blue-700">¥{community.avgRent}<span className="text-sm font-normal text-blue-500">/月 均价</span></div>
          <div className="text-xs text-gray-500 mt-1">{community.listings.length} 套在租房源</div>
        </div>

        <div className="divide-y divide-gray-100">
          {community.listings.map((l) => (
            <div
              key={l.id}
              className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedListing(l)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-800">{l.rooms}</span>
                <span className="text-sm font-bold text-orange-600">¥{l.rent}</span>
              </div>
              <p className="text-xs text-gray-600 mb-1">{l.title}</p>
              <div className="flex gap-2 text-xs text-gray-400">
                <span>{l.area}m²</span>
                <span>{l.direction}</span>
                <span>{l.floor}</span>
              </div>
              {l.tags && l.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {l.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ListingDetailModal
        listing={selectedListing}
        communityName={community.name}
        onClose={() => setSelectedListing(null)}
      />
    </>
  );
}
