"use client";

import { useCanvasStore } from "@/stores/canvasStore";
import { clamp } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

export default function ZoomControls() {
  const zoom = useCanvasStore((s) => s.viewport.zoom);
  const setViewport = useCanvasStore((s) => s.setViewport);

  return (
    <div
      id="zoom-controls"
      className="absolute bottom-4 left-4 z-50 flex items-center gap-1 px-2 py-1.5 rounded-xl"
      style={{
        background: "rgba(30, 30, 35, 0.4)",
        backdropFilter: "blur(40px) saturate(200%)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <button
        onClick={() => setViewport({ zoom: clamp(zoom * 0.8, 0.1, 5) })}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
        title="Zoom Out"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={() => setViewport({ zoom: 1, offsetX: 0, offsetY: 0 })}
        className="flex items-center justify-center min-w-[50px] h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all text-xs font-medium"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={() => setViewport({ zoom: clamp(zoom * 1.2, 0.1, 5) })}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
        title="Zoom In"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
