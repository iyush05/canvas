import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";

const PORT = Number(process.env.WS_PORT) || 3001;
const PERSIST_INTERVAL_MS = 5000;

// ─── Types ──────────────────────────────────────────────────

interface Client {
  ws: WebSocket;
  clientId: string;
  userName: string;
  color: string;
  roomId: string;
}

interface PendingOp {
  type: string;
  data: unknown;
  timestamp: number;
}

// ─── Room State ─────────────────────────────────────────────

const rooms = new Map<string, Map<string, Client>>();
const pendingOps = new Map<string, PendingOp[]>();

// ─── Server ─────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

console.log(`[WS] WebSocket server running on ws://localhost:${PORT}`);

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://localhost:${PORT}`);
  const roomId = url.searchParams.get("roomId");
  const clientId = url.searchParams.get("clientId");
  const userName = decodeURIComponent(url.searchParams.get("userName") || "Anon");
  const color = decodeURIComponent(url.searchParams.get("color") || "#339af0");

  if (!roomId || !clientId) {
    ws.close(1008, "Missing roomId or clientId");
    return;
  }

  // Join room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }

  const room = rooms.get(roomId)!;
  const client: Client = { ws, clientId, userName, color, roomId };
  room.set(clientId, client);

  console.log(`[WS] ${userName} (${clientId}) joined room ${roomId} (${room.size} users)`);

  // Notify others
  broadcastToRoom(roomId, clientId, {
    type: "user:joined",
    clientId,
    userName,
    color,
  });

  // Handle messages
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(roomId, clientId, msg);
    } catch (err) {
      console.error("[WS] Bad message:", err);
    }
  });

  // Handle disconnect
  ws.on("close", () => {
    room.delete(clientId);
    console.log(`[WS] ${userName} (${clientId}) left room ${roomId} (${room.size} users)`);

    broadcastToRoom(roomId, clientId, {
      type: "user:left",
      clientId,
    });

    // If room is empty, flush pending ops and clean up
    if (room.size === 0) {
      flushPendingOps(roomId);
      rooms.delete(roomId);
      console.log(`[WS] Room ${roomId} is empty, cleaned up`);
    }
  });
});

// ─── Message Handler ────────────────────────────────────────

function handleMessage(roomId: string, clientId: string, msg: Record<string, unknown>) {
  switch (msg.type) {
    case "element:create":
      broadcastToRoom(roomId, clientId, { ...msg, clientId });
      queueOp(roomId, { type: "create", data: msg.element, timestamp: Date.now() });
      break;

    case "element:update":
      broadcastToRoom(roomId, clientId, { ...msg, clientId });
      queueOp(roomId, {
        type: "update",
        data: { elementId: msg.elementId, changes: msg.changes },
        timestamp: Date.now(),
      });
      break;

    case "element:delete":
      broadcastToRoom(roomId, clientId, { ...msg, clientId });
      queueOp(roomId, {
        type: "delete",
        data: { elementId: msg.elementId },
        timestamp: Date.now(),
      });
      break;

    case "cursor:move": {
      const client = rooms.get(roomId)?.get(clientId);
      broadcastToRoom(roomId, clientId, {
        type: "cursor:moved",
        clientId,
        position: msg.position,
        userName: client?.userName,
        color: client?.color,
      });
      break;
    }

    case "batch:update": {
      const ops = msg.operations as Record<string, unknown>[];
      if (Array.isArray(ops)) {
        for (const op of ops) {
          handleMessage(roomId, clientId, op);
        }
      }
      break;
    }
  }
}

// ─── Broadcasting ───────────────────────────────────────────

function broadcastToRoom(roomId: string, excludeClientId: string, message: unknown) {
  const room = rooms.get(roomId);
  if (!room) return;

  const payload = JSON.stringify(message);
  for (const [id, client] of room) {
    if (id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

// ─── Batched Persistence ────────────────────────────────────

function queueOp(roomId: string, op: PendingOp) {
  if (!pendingOps.has(roomId)) {
    pendingOps.set(roomId, []);
  }
  pendingOps.get(roomId)!.push(op);
}

async function flushPendingOps(roomId: string) {
  const ops = pendingOps.get(roomId);
  if (!ops || ops.length === 0) return;

  pendingOps.delete(roomId);

  try {
    // Batch persist via REST API
    const creates: unknown[] = [];
    const updates: unknown[] = [];
    const deletes: string[] = [];

    for (const op of ops) {
      switch (op.type) {
        case "create":
          creates.push(op.data);
          break;
        case "update": {
          const d = op.data as { elementId: string; changes: unknown };
          updates.push({ id: d.elementId, ...d.changes as object });
          break;
        }
        case "delete": {
          const dd = op.data as { elementId: string };
          deletes.push(dd.elementId);
          break;
        }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (creates.length > 0) {
      await fetch(`${baseUrl}/api/rooms/${roomId}/elements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements: creates }),
      }).catch((e) => console.error("[WS] Persist creates failed:", e));
    }

    if (updates.length > 0) {
      await fetch(`${baseUrl}/api/rooms/${roomId}/elements`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements: updates }),
      }).catch((e) => console.error("[WS] Persist updates failed:", e));
    }

    if (deletes.length > 0) {
      await fetch(`${baseUrl}/api/rooms/${roomId}/elements`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elementIds: deletes }),
      }).catch((e) => console.error("[WS] Persist deletes failed:", e));
    }

    console.log(`[WS] Flushed ${ops.length} ops for room ${roomId}`);
  } catch (err) {
    console.error("[WS] Flush failed:", err);
  }
}

// Periodic flush
setInterval(() => {
  for (const roomId of pendingOps.keys()) {
    flushPendingOps(roomId);
  }
}, PERSIST_INTERVAL_MS);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[WS] Shutting down...");
  for (const roomId of pendingOps.keys()) {
    await flushPendingOps(roomId);
  }
  wss.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`RUNNING ON ${PORT}`);
});