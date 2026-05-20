"use client";

import { useCanvasStore } from "@/stores/canvasStore";

export default function ActiveUsers() {
  const userName = useCanvasStore((s) => s.userName);
  const userColor = useCanvasStore((s) => s.userColor);
  const remoteCursors = useCanvasStore((s) => s.remoteCursors);
  const isSharedMode = useCanvasStore((s) => s.isSharedMode);

  if (!isSharedMode) return null;

  const users = [
    { id: "local", name: `${userName} (You)`, color: userColor },
    ...Array.from(remoteCursors.values()).map((c) => ({
      id: c.clientId,
      name: c.userName,
      color: c.color,
    })),
  ];

  // Limit to 5 avatars to prevent UI overflow, show "+X" if more
  const displayUsers = users.slice(0, 5);
  const extraCount = Math.max(0, users.length - 5);

  return (
    <div className="absolute top-4 right-[160px] z-50 flex items-center pointer-events-auto">
      <div className="flex items-center -space-x-3">
        {displayUsers.map((u, i) => (
          <div
            key={u.id}
            title={u.name}
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-1 hover:scale-110 hover:z-10 relative cursor-default"
            style={{
              backgroundColor: u.color,
              border: "2px solid rgba(255, 255, 255, 0.2)",
              zIndex: 50 - i,
            }}
          >
            {u.name.substring(0, 2).toUpperCase()}
          </div>
        ))}
        {extraCount > 0 && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg relative cursor-default backdrop-blur-md"
            style={{
              backgroundColor: "rgba(30, 30, 35, 0.8)",
              border: "2px solid rgba(255, 255, 255, 0.15)",
              zIndex: 0,
            }}
          >
            +{extraCount}
          </div>
        )}
      </div>
    </div>
  );
}
