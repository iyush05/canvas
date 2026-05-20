"use client";

import { useState, useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import type { Tool } from "@/types/canvas";
import { CURSOR_COLORS } from "@/lib/utils";
import {
  MousePointer2,
  PenLine,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  Type
} from "lucide-react";
import ImageUploadModal from "../ui/ImageUploadModal";

const TOOLS: { id: Tool; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { id: "select", label: "Select", icon: <MousePointer2 size={20} />, shortcut: "V" },
  { id: "pen", label: "Pen", icon: <PenLine size={20} />, shortcut: "P" },
  { id: "text", label: "Text", icon: <Type size={20} />, shortcut: "T" },
  { id: "rectangle", label: "Rectangle", icon: <Square size={20} />, shortcut: "R" },
  { id: "ellipse", label: "Ellipse", icon: <Circle size={20} />, shortcut: "O" },
  { id: "line", label: "Line", icon: <Minus size={20} />, shortcut: "L" },
  { id: "arrow", label: "Arrow", icon: <MoveUpRight size={20} />, shortcut: "A" },
];

const COLORS = [
  "#f5f5f5", // off-white
  ...CURSOR_COLORS
];

const STROKE_WIDTHS = [1, 2, 4, 6, 10];

export default function Toolbar() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const activeStyle = useCanvasStore((s) => s.activeStyle);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const setActiveStyle = useCanvasStore((s) => s.setActiveStyle);

  const isDrawingTool = activeTool !== "select";

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">

      {/* Context-Aware Popover (Colors & Stroke) */}
      <div
        className={`
          flex items-center gap-4 px-5 py-2.5 rounded-full
          transition-all duration-300 ease-out origin-bottom
          ${isDrawingTool ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2 pointer-events-none"}
        `}
        style={{
          background: "rgba(30, 30, 35, 0.4)",
          backdropFilter: "blur(40px) saturate(200%)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((color) => (
            <button
              key={color}
              id={`color-${color.slice(1)}`}
              onClick={() => setActiveStyle({ strokeColor: color })}
              className={`
                w-6 h-6 rounded-full transition-all duration-150 flex items-center justify-center
                ${activeStyle.strokeColor === color
                  ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110 shadow-lg"
                  : "hover:scale-110 ring-1 ring-white/20"
                }
              `}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Stroke Width */}
        <div className="flex items-center gap-1">
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width}
              id={`stroke-${width}`}
              onClick={() => setActiveStyle({ strokeWidth: width })}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full
                transition-all duration-150
                ${activeStyle.strokeWidth === width
                  ? "bg-white/20 text-white shadow-inner"
                  : "text-white/60 hover:text-white hover:bg-white/10"
                }
              `}
              title={`${width}px`}
            >
              <span
                className="rounded-full bg-current"
                style={{
                  width: `${Math.max(3, width + 1)}px`,
                  height: `${Math.max(3, width + 1)}px`,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Dock */}
      <div
        id="toolbar"
        className="flex items-center gap-1 px-3 py-2.5 rounded-full"
        style={{
          background: "rgba(30, 30, 35, 0.4)",
          backdropFilter: "blur(40px) saturate(200%)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Tool Buttons */}
        <div className="flex items-center gap-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              id={`tool-${tool.id}`}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className={`
                flex items-center justify-center w-11 h-11 rounded-full
                transition-all duration-150 ease-out select-none
                ${activeTool === tool.id
                  ? "bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  : "text-white/60 hover:text-white hover:bg-white/10"
                }
              `}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-white/10 mx-2" />

        {/* Image Upload integrated into Dock */}
        <ImageUploadModal />
      </div>
    </div>
  );
}
