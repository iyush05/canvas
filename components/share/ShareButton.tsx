"use client";

import { useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useRouter } from "next/navigation";
import { Link2, Check } from "lucide-react";

export default function ShareButton() {
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const isSharedMode = useCanvasStore((s) => s.isSharedMode);

  const handleShare = async () => {
    // If already in a room or already generated a URL, just copy it
    if (isSharedMode || shareUrl) {
      const urlToCopy = shareUrl || window.location.href;
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    setIsSharing(true);
    try {
      const state = useCanvasStore.getState();
      const elements = Array.from(state.elements.values()).map((el) => ({
        id: el.id,
        type: el.type,
        data: el.data,
        style: el.style,
        posX: el.posX,
        posY: el.posY,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        zIndex: el.zIndex,
      }));

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      });

      if (!res.ok) throw new Error("Failed to create room");
      const { id: roomId } = await res.json();

      const url = `${window.location.origin}/room/${roomId}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      state.setSharedMode(roomId);
      router.push(`/room/${roomId}`);
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      id="share-btn"
      onClick={handleShare}
      disabled={isSharing}
      className={`
        absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
        ${
          copied
            ? "text-green-400"
            : "text-white/80 hover:text-white"
        }
      `}
      style={{
        background: copied ? "rgba(22, 163, 74, 0.2)" : "rgba(30, 30, 35, 0.4)",
        backdropFilter: "blur(40px) saturate(200%)",
        border: copied ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      {isSharing ? (
        <span className="animate-spin text-white/60">⟳</span>
      ) : copied ? (
        <>
          <Check size={16} />
          Copied!
        </>
      ) : (
        <>
          <Link2 size={16} className={(shareUrl || isSharedMode) ? "text-indigo-400" : "text-white/60"} />
          {(shareUrl || isSharedMode) ? "Copy Link" : "Share"}
        </>
      )}
    </button>
  );
}
