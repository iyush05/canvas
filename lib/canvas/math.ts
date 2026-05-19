import type { Point } from "@/types/canvas";

// ─── Coordinate Transforms ────────────────────────────────

/** Convert screen coordinates to world coordinates */
export function screenToWorld(
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Point {
  return {
    x: (screenX - offsetX) / zoom,
    y: (screenY - offsetY) / zoom,
  };
}

/** Convert world coordinates to screen coordinates */
export function worldToScreen(
  worldX: number,
  worldY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Point {
  return {
    x: worldX * zoom + offsetX,
    y: worldY * zoom + offsetY,
  };
}

// ─── Bounding Box ─────────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Check if a point is inside a bounding box */
export function isPointInRect(
  px: number,
  py: number,
  rect: BoundingBox
): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.width &&
    py >= rect.y &&
    py <= rect.y + rect.height
  );
}

/** Check if a point is near a line segment (within threshold) */
export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/** Check if a point is inside an ellipse */
export function isPointInEllipse(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): boolean {
  if (rx === 0 || ry === 0) return false;
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Get the visible world-space bounds from the viewport */
export function getVisibleBounds(
  canvasWidth: number,
  canvasHeight: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): BoundingBox {
  const topLeft = screenToWorld(0, 0, offsetX, offsetY, zoom);
  const bottomRight = screenToWorld(
    canvasWidth,
    canvasHeight,
    offsetX,
    offsetY,
    zoom
  );
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

/** Check if two bounding boxes overlap (for frustum culling) */
export function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Get bounding box for a list of points */
export function getBoundsFromPoints(points: Point[]): BoundingBox {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
