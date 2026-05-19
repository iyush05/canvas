"use client";

import dynamic from "next/dynamic";
import Toolbar from "@/components/toolbar/Toolbar";
import ZoomControls from "@/components/ui/ZoomControls";
import ShareButton from "@/components/share/ShareButton";

const Canvas = dynamic(() => import("@/components/canvas/Canvas"), {
  ssr: false,
});

interface WhiteboardAppProps {
  mode: "local" | "shared";
  roomId?: string;
}

const liquidGlassStyle = {
  background: "rgba(30, 30, 35, 0.4)",
  backdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
};

export default function WhiteboardApp({ mode, roomId }: WhiteboardAppProps) {
  return (
    <div id="whiteboard-app" className="relative w-full h-screen overflow-hidden bg-black">
      
      {/* Ambient Dark Orbs for Glass Refraction with Maximum Blur */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-900/20 rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-fuchsia-900/10 rounded-full blur-[250px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[40vw] h-[40vw] bg-blue-900/10 rounded-full blur-[200px] pointer-events-none" />

      {/* The transparent Canvas */}
      <div className="relative z-0 w-full h-full">
        <Canvas />
      </div>
      
      {/* Liquid Glass UI Layer */}
      <div className="relative z-50">
        <Toolbar />
        <ZoomControls />
        <ShareButton />

        {/* Keyboard hints */}
        <div
          className="absolute bottom-4 right-4 flex items-center gap-3 px-4 py-2 rounded-xl text-[11px] font-medium text-neutral-300"
          style={liquidGlassStyle}
        >
          <span>Space+Drag: Pan</span>
          <span>Scroll: Zoom</span>
          <span>⌘Z: Undo</span>
          <span>Del: Delete</span>
        </div>

        {/* Mode indicator */}
        {mode === "shared" && roomId && (
          <div
            className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-green-400"
            style={liquidGlassStyle}
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            Live Room
          </div>
        )}
      </div>
    </div>
  );
}
