"use client";

import { useEffect } from "react";
import WhiteboardApp from "@/components/room/WhiteboardApp";
import { useCanvasStore } from "@/stores/canvasStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { CanvasElement } from "@/types/canvas";

interface RoomCanvasProps {
  roomId: string;
  initialElements: CanvasElement[];
}

export default function RoomCanvas({ roomId, initialElements }: RoomCanvasProps) {
  const loadElements = useCanvasStore((s) => s.loadElements);
  const setSharedMode = useCanvasStore((s) => s.setSharedMode);

  // Load initial elements from server
  useEffect(() => {
    loadElements(initialElements);
    setSharedMode(roomId);
  }, [roomId, initialElements, loadElements, setSharedMode]);

  // Connect WebSocket
  useWebSocket(roomId);

  return <WhiteboardApp mode="shared" roomId={roomId} />;
}
