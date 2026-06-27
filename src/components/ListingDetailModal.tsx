import { useState } from "react";
import type { Listing } from "../types";

interface Props {
  listing: Listing | null;
  communityName: string;
  onClose: () => void;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#14b8a6", "#f97316"];

/** Generates a unique inline SVG for a room based on seed number */
function RoomImage({ src, seed, rooms, rent }: { src: string; seed: number; rooms: string; rent: number }) {
  const [failed, setFailed] = useState(false);
  if (src.startsWith("http") && !failed) {
    return <img src={src} alt={rooms} className="w-full h-full object-cover" onError={() => setFailed(true)} />;
  }
  return <RoomSvg seed={seed} rooms={rooms} rent={rent} />;
}

function RoomSvg({ seed, rooms, rent }: { seed: number; rooms: string; rent: number }) {
  const color = COLORS[seed % COLORS.length];
  const subColor = COLORS[(seed + 3) % COLORS.length];
  // Pattern based on seed for visual variety
  const vOffset = 20 + (seed % 80);
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={"g" + seed} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={subColor} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={"url(#g" + seed + ")"} />
      {/* Room shape */}
      <rect x={100} y={vOffset - 10} width={200} height={180} rx={8} fill="white" opacity={0.2} />
      {/* Door */}
      <rect x={180} y={vOffset + 100} width={40} height={70} rx={4} fill="white" opacity={0.35} />
      {/* Window */}
      <rect x={120} y={vOffset + 10} width={60} height={50} rx={4} fill="white" opacity={0.3} />
      <rect x={220} y={vOffset + 10} width={60} height={50} rx={4} fill="white" opacity={0.3} />
      {/* Roof */}
      <polygon points={[80, vOffset - 10, 200, vOffset - 60, 320, vOffset - 10].join(",")} fill="white" opacity={0.15} />
      {/* Room label */}
      <text x="200" y={vOffset + 160} textAnchor="middle" fill="white" fontSize={24} fontWeight="bold" fontFamily="sans-serif">
        {rooms}
      </text>
      {/* Rent label */}
      <text x="200" y={vOffset + 190} textAnchor="middle" fill="white" fontSize={18} fontFamily="sans-serif" opacity={0.9}>
        ¥{rent}/月
      </text>
    </svg>
  );
}

export default function ListingDetailModal({ listing, communityName, onClose }: Props) {
  const [imgIndex, setImgIndex] = useState(0);

  if (!listing) return null;

  const numImages = listing.images.length;
  const seed = parseInt(listing.id) * 7 + 13 + imgIndex * 100;
  const prevImg = () => setImgIndex((i) => (i > 0 ? i - 1 : numImages - 1));
  const nextImg = () => setImgIndex((i) => (i < numImages - 1 ? i + 1 : 0));

  const rentType = listing.rooms.startsWith("1室") && listing.rent < 3000 ? "合租" : "整租";
  const bgColor = COLORS[parseInt(listing.id) % COLORS.length];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-[520px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image Carousel - uses inline SVG only, no external network requests */}
        <div className="relative rounded-t-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
          <RoomImage src={listing.images[imgIndex]} seed={seed} rooms={listing.rooms} rent={listing.rent} />
          {numImages > 1 && (
            <>
              <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-700 text-lg shadow cursor-pointer z-10">&lsaquo;</button>
              <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-700 text-lg shadow cursor-pointer z-10">&rsaquo;</button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                {imgIndex + 1}/{numImages}
              </div>
            </>
          )}
          <button onClick={onClose} className="absolute top-2 right-2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center text-sm cursor-pointer">&times;</button>
        </div>

        {/* Title & Price */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-gray-900">{listing.rooms} · {listing.area}m²</h3>
            <span className="text-xl font-bold text-orange-600">¥{listing.rent}<span className="text-sm font-normal text-gray-400">/月</span></span>
          </div>
          <p className="text-sm text-gray-600">{listing.title} · {communityName}</p>
        </div>

        {/* Tags */}
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {listing.tags.map((tag, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
          <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{listing.decoration}</span>
          {listing.isElevator && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">有电梯</span>}
          <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{rentType}</span>
        </div>

        {/* Details Grid */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-2 text-sm border-b border-gray-100">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-gray-400 text-xs">面积</div>
            <div className="font-semibold text-gray-800">{listing.area}m²</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-gray-400 text-xs">朝向</div>
            <div className="font-semibold text-gray-800">{listing.direction}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-gray-400 text-xs">楼层</div>
            <div className="font-semibold text-gray-800">{listing.floor}</div>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-xs text-gray-400 mb-1">房源描述</div>
          <p className="text-sm text-gray-700 leading-relaxed">{listing.description}</p>
        </div>

        {/* Landlord Info */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-xs text-gray-400 mb-2">房东信息</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
              {listing.landlordName.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">{listing.landlordName}</div>
              <a href={"tel:" + listing.landlordPhone} className="text-sm text-blue-600 hover:underline">{listing.landlordPhone}</a>
              {listing.landlordWechat && (
                <div className="text-xs text-gray-400 mt-0.5">微信: {listing.landlordWechat}</div>
              )}
            </div>
          </div>
        </div>

        {/* Listed Date */}
        <div className="px-4 py-2.5 flex items-center justify-between text-xs text-gray-400">
          <span>发布日期: {listing.listedDate}</span>
          <span>房源编号: {listing.id}</span>
        </div>
      </div>
    </div>
  );
}
