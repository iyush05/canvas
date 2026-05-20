// ─── Tool Types ─────────────────────────────────────────────

export type Tool =
  | "select"
  | "pen"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "image"
  | "text";

export type ElementType = Exclude<Tool, "select">;

// ─── Style ──────────────────────────────────────────────────

export interface ElementStyle {
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  opacity: number;
}

export const DEFAULT_STYLE: ElementStyle = {
  strokeColor: "#f5f5f5",
  strokeWidth: 2,
  fillColor: "transparent",
  opacity: 1,
};

// ─── Element Data (per-type payloads) ───────────────────────

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface PenData {
  points: Point[];
  smoothing: boolean;
}

export interface RectangleData {
  borderRadius: number;
}

export interface EllipseData { }

export interface LineData {
  points: Point[];
}

export interface ArrowData {
  points: Point[];
  arrowHead: "triangle" | "none";
}

export interface ImageData {
  src: string; // base64 or URL
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
}

export interface TextData {
  text: string;
  fontSize: number;
  fontFamily: string;
}

export type ElementData =
  | PenData
  | RectangleData
  | EllipseData
  | LineData
  | ArrowData
  | ImageData
  | TextData;

// ─── Canvas Element ─────────────────────────────────────────

export interface CanvasElement {
  id: string;
  type: ElementType;
  data: ElementData;
  style: ElementStyle;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  version: number;
}

// ─── Viewport ───────────────────────────────────────────────

export interface Viewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export const DEFAULT_VIEWPORT: Viewport = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

// ─── Cursor / Presence ──────────────────────────────────────

export interface CursorPosition {
  x: number;
  y: number;
  clientId: string;
  userName: string;
  color: string;
  lastSeen: number;
}

// ─── WebSocket Protocol ─────────────────────────────────────

// Client → Server
export type ClientMessage =
  | { type: "element:create"; element: CanvasElement }
  | {
    type: "element:update";
    elementId: string;
    changes: Partial<CanvasElement>;
  }
  | { type: "element:delete"; elementId: string }
  | {
    type: "cursor:move";
    position: { x: number; y: number };
    userName?: string;
  }
  | { type: "batch:update"; operations: ClientMessage[] };

// Server → Client
export type ServerMessage =
  | {
    type: "room:state";
    elements: CanvasElement[];
    users: CursorPosition[];
  }
  | { type: "element:create"; element: CanvasElement; clientId: string }
  | {
    type: "element:update";
    elementId: string;
    changes: Partial<CanvasElement>;
    clientId: string;
  }
  | { type: "element:delete"; elementId: string; clientId: string }
  | {
    type: "cursor:moved";
    clientId: string;
    position: { x: number; y: number };
    userName?: string;
    color?: string;
  }
  | { type: "user:joined"; clientId: string; userName: string; color: string }
  | { type: "user:left"; clientId: string }
  | { type: "error"; message: string };
