"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import type { ServerMessage, ClientMessage, CanvasElement } from "@/types/canvas";

const getWsUrl = () => {
  let url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
  if (typeof window !== "undefined") {
    // If accessing via local IP but URL is localhost, replace it to allow local network testing
    if (url.includes("localhost") && window.location.hostname !== "localhost") {
      url = url.replace("localhost", window.location.hostname);
    }
  }
  return url;
};

const RECONNECT_DELAY = 2000;
const CURSOR_THROTTLE_MS = 50;

export function useWebSocket(roomId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const lastCursorSend = useRef(0);
  const isRemoteUpdateRef = useRef(false);

  const store = useCanvasStore;

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      const state = store.getState();
      const myClientId = state.clientId;

      switch (msg.type) {
        case "room:state":
          isRemoteUpdateRef.current = true;
          state.loadElements(msg.elements);
          isRemoteUpdateRef.current = false;
          break;

        case "element:create":
          if (msg.clientId !== myClientId) {
            isRemoteUpdateRef.current = true;
            state.addElement(msg.element);
            isRemoteUpdateRef.current = false;
          }
          break;

        case "element:update":
          if (msg.clientId !== myClientId) {
            isRemoteUpdateRef.current = true;
            state.updateElement(msg.elementId, msg.changes);
            isRemoteUpdateRef.current = false;
          }
          break;

        case "element:delete":
          if (msg.clientId !== myClientId) {
            isRemoteUpdateRef.current = true;
            state.deleteElement(msg.elementId);
            isRemoteUpdateRef.current = false;
          }
          break;

        case "cursor:moved":
          if (msg.clientId !== myClientId) {
            state.setRemoteCursor({
              x: msg.position.x,
              y: msg.position.y,
              clientId: msg.clientId,
              userName: msg.userName || "Anon",
              color: msg.color || "#339af0",
              lastSeen: Date.now(),
            });
          }
          break;

        case "user:left":
          state.removeRemoteCursor(msg.clientId);
          break;
      }
    },
    [store]
  );

  // Connect on mount
  useEffect(() => {
    let isActive = true;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout>;

    const initWs = () => {
      if (!isActive) return;

      const { clientId, userName, userColor } = store.getState();
      const baseUrl = getWsUrl();
      const url = `${baseUrl}?roomId=${roomId}&clientId=${clientId}&userName=${encodeURIComponent(userName)}&color=${encodeURIComponent(userColor)}`;

      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected to room:", roomId);
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          handleMessage(msg);
        } catch (err) {
          console.error("[WS] Failed to parse message:", err);
        }
      };

      ws.onclose = () => {
        if (!isActive) return;
        console.log("[WS] Disconnected");
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        timer = setTimeout(initWs, RECONNECT_DELAY);
      };

      ws.onerror = (err) => {
        if (!isActive) return;
        console.error(`[WS] Error connecting to ${url}:`, err);
        ws?.close();
      };
    };

    initWs();

    return () => {
      isActive = false;
      clearTimeout(timer);
      if (ws) {
        ws.close();
      }
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [roomId, store, handleMessage]);

  // Send message helper
  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  // Subscribe to store changes and broadcast
  useEffect(() => {
    // Subscribe to element additions
    const unsub = store.subscribe((state, prev) => {
      if (isRemoteUpdateRef.current) return;
      
      if (state.elements !== prev.elements && state.isSharedMode) {
        // Find new elements
        for (const [id, el] of state.elements) {
          if (!prev.elements.has(id)) {
            send({ type: "element:create", element: el });
          }
        }
        // Find updated elements
        for (const [id, el] of state.elements) {
          const prevEl = prev.elements.get(id);
          if (prevEl && prevEl !== el) {
            send({
              type: "element:update",
              elementId: id,
              changes: el,
            });
          }
        }
        // Find deleted elements
        for (const [id] of prev.elements) {
          if (!state.elements.has(id)) {
            send({ type: "element:delete", elementId: id });
          }
        }
      }
    });

    return unsub;
  }, [store, send]);

  // Track cursor and send periodically
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastCursorSend.current < CURSOR_THROTTLE_MS) return;
      lastCursorSend.current = now;

      const canvas = document.getElementById("whiteboard-canvas") as HTMLCanvasElement;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const { viewport } = store.getState();
      const worldX = (e.clientX - rect.left - viewport.offsetX) / viewport.zoom;
      const worldY = (e.clientY - rect.top - viewport.offsetY) / viewport.zoom;

      send({
        type: "cursor:move",
        position: { x: worldX, y: worldY },
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [store, send]);

}
