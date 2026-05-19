import type { CanvasElement, PenData, ArrowData, Point } from "@/types/canvas";

// ─── Render Dispatch ──────────────────────────────────────

export function renderElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
): void {
  ctx.save();
  ctx.translate(element.posX, element.posY);

  if (element.rotation !== 0) {
    const cx = element.width / 2;
    const cy = element.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  ctx.globalAlpha = element.style.opacity;
  ctx.strokeStyle = element.style.strokeColor;
  ctx.lineWidth = element.style.strokeWidth;
  ctx.fillStyle = element.style.fillColor;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  switch (element.type) {
    case "pen":
      renderPen(ctx, element);
      break;
    case "rectangle":
      renderRectangle(ctx, element);
      break;
    case "ellipse":
      renderEllipse(ctx, element);
      break;
    case "line":
      renderLine(ctx, element);
      break;
    case "arrow":
      renderArrow(ctx, element);
      break;
    case "image":
      renderImage(ctx, element);
      break;
  }

  ctx.restore();
}

// ─── Pen ──────────────────────────────────────────────────

function renderPen(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
): void {
  const data = element.data as PenData;
  if (!data.points || data.points.length < 2) {
    if (data.points?.length === 1) {
      // Single dot
      ctx.beginPath();
      ctx.arc(
        data.points[0].x - element.posX,
        data.points[0].y - element.posY,
        element.style.strokeWidth / 2,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = element.style.strokeColor;
      ctx.fill();
    }
    return;
  }

  ctx.beginPath();

  const pts = data.points.map((p) => ({
    x: p.x - element.posX,
    y: p.y - element.posY,
  }));

  if (data.smoothing && pts.length > 2) {
    renderSmoothPath(ctx, pts);
  } else {
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
  }

  ctx.stroke();
}

/** Catmull-Rom spline smoothing */
function renderSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: Point[]
): void {
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

// ─── Rectangle ────────────────────────────────────────────

function renderRectangle(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
): void {
  const w = element.width;
  const h = element.height;

  if (element.style.fillColor !== "transparent") {
    ctx.fillRect(0, 0, w, h);
  }
  ctx.strokeRect(0, 0, w, h);
}

// ─── Ellipse ──────────────────────────────────────────────

function renderEllipse(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
): void {
  const cx = element.width / 2;
  const cy = element.height / 2;

  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.abs(cx), Math.abs(cy), 0, 0, Math.PI * 2);

  if (element.style.fillColor !== "transparent") {
    ctx.fill();
  }
  ctx.stroke();
}

// ─── Line ─────────────────────────────────────────────────

function renderLine(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
): void {
  const data = element.data as { points: Point[] };
  if (!data.points || data.points.length < 2) return;

  ctx.beginPath();
  const pts = data.points.map((p) => ({
    x: p.x - element.posX,
    y: p.y - element.posY,
  }));

  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
}

// ─── Arrow ────────────────────────────────────────────────

function renderArrow(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
): void {
  const data = element.data as ArrowData;
  if (!data.points || data.points.length < 2) return;

  const pts = data.points.map((p) => ({
    x: p.x - element.posX,
    y: p.y - element.posY,
  }));

  // Draw the line
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();

  // Draw arrowhead
  if (data.arrowHead === "triangle") {
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    const headLen = 12 + element.style.strokeWidth;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(
      last.x - headLen * Math.cos(angle - Math.PI / 6),
      last.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      last.x - headLen * Math.cos(angle + Math.PI / 6),
      last.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = element.style.strokeColor;
    ctx.fill();
  }
}

// ─── Image ────────────────────────────────────────────────

// Cache loaded images to avoid re-decoding
const imageCache = new Map<string, HTMLImageElement>();

function renderImage(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
): void {
  const data = element.data as { src: string };
  if (!data.src) return;

  let img = imageCache.get(data.src);
  if (!img) {
    img = new Image();
    img.src = data.src;
    imageCache.set(data.src, img);
    // Image will render on next frame after load
    img.onload = () => {
      // trigger re-render by just existing — the animation loop will pick it up
    };
    return;
  }

  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, element.width, element.height);
  }
}

// ─── Selection Handles ────────────────────────────────────

export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
): void {
  ctx.save();
  ctx.translate(element.posX, element.posY);

  ctx.strokeStyle = "#339af0";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(-4, -4, element.width + 8, element.height + 8);
  ctx.setLineDash([]);

  // Corner handles
  const handleSize = 8;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#339af0";
  ctx.lineWidth = 1.5;

  const corners = [
    [-4, -4],
    [element.width + 4, -4],
    [-4, element.height + 4],
    [element.width + 4, element.height + 4],
  ];

  for (const [x, y] of corners) {
    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
  }

  ctx.restore();
}
