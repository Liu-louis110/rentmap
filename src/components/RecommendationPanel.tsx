import { useState, useRef, useCallback, useEffect } from "react";
import type { Recommendation } from "../types";

interface Props {
  recommendations: Recommendation[];
  onSelect: (id: string) => void;
  selectedId: string | null;
  companyName: string;
  onClose: () => void;
}

const tags = [
  { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", label: "最佳推荐" },
  { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300", label: "优选推荐" },
  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", label: "经济之选" },
  { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", label: "性价比之选" },
  { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", label: "可考虑" },
];

export default function RecommendationPanel({ recommendations, onSelect, selectedId, companyName, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 8, y: 8 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const [size, setSize] = useState({ w: 360, h: 500 });
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, pw: 0, ph: 0 });

  const handleResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, pw: size.w, ph: size.h };
  }, [size]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing) return;
    const dx = e.clientX - resizeStart.current.x;
    const dy = e.clientY - resizeStart.current.y;
    setSize({ w: Math.max(260, resizeStart.current.pw + dx), h: Math.max(200, resizeStart.current.ph + dy) });
  }, [resizing]);

  const handleResizeUp = useCallback(() => { setResizing(false); }, []);

  useEffect(() => {
    if (resizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeUp);
      return () => {
        window.removeEventListener("mousemove", handleResizeMove);
        window.removeEventListener("mouseup", handleResizeUp);
      };
    }
  }, [resizing, handleResizeMove, handleResizeUp]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPos({
      x: Math.max(0, dragStart.current.px + dx),
      y: Math.max(0, dragStart.current.py + dy),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  if (recommendations.length === 0) return null;

  return (
    <div
      ref={panelRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="fixed z-50"
      style={{ left: pos.x + "px",
        top: pos.y + "px",
        width: size.w + "px"
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl overflow-hidden flex flex-col"
        style={{   maxHeight: Math.min(size.h, window.innerHeight) + "px",
          cursor: dragging ? "grabbing" : "default",
        }}
      >
        <div
          onMouseDown={handleMouseDown}
          className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white flex items-center cursor-grab select-none"
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold">
              智能推荐 Top {recommendations.length}
            </h3>
            <p className="text-xs text-blue-100 mt-0.5 truncate">
              {companyName} · 综合租金+通勤
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-blue-400/30 text-white/80 hover:text-white ml-2 shrink-0 cursor-pointer text-sm"
            title="关闭推荐"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {recommendations.map((r, i) => (
            <div
              key={r.community.id}
              onClick={() => onSelect(r.community.id)}
              className={"px-4 py-3 cursor-pointer transition-colors " + (
                selectedId === r.community.id ? "bg-blue-50" : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white " + (
                      i === 0 ? "bg-yellow-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-blue-400"
                    )
                  }
                >
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-gray-800 truncate">
                  {r.community.name}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {r.community.district}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs mb-1">
                <span className="text-orange-600 font-medium">
                  ¥{r.avgRent}/月
                </span>
                <span className="text-blue-600 font-medium">
                  公交 {r.commuteMinutes}分钟
                </span>
                <span className="text-gray-400 ml-auto">
                  {r.community.listings.length} 套在租
                </span>
              </div>

              {/* Route detail line */}
              {r.route && (
                <div className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
                  <div className="flex items-start gap-1">
                    <svg className="w-3 h-3 mt-0.5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>{r.route.transit || "直接步行"}</span>
                  </div>
                </div>
              )}

              <div
                className={
                  "inline-block px-2 py-0.5 text-xs rounded-full border " +
                  tags[i].bg + " " + tags[i].text + " " + tags[i].border
                }
              >
                {tags[i].label}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeDown}
        className="absolute right-0 bottom-0 w-5 h-5 cursor-se-resize z-10"
      >
        <svg className="absolute right-0.5 bottom-0.5 text-gray-400" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M12 0v3L9 0h3zM12 5v3L7 5h5zM12 10v2H10l2-2zM7 12l5-5v5H7z"/>
        </svg>
      </div>
    </div>
  );
}
