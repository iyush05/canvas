import type {
  CanvasElement,
  ElementType,
  ElementStyle,
  PenData,
  RectangleData,
  EllipseData,
  LineData,
  ArrowData,
  Point,
} from "@/types/canvas";
import { generateElementId } from "@/lib/utils";
import { getBoundsFromPoints } from "@/lib/canvas/math";

/** Create a new element with defaults */
export function createElement(
  type: ElementType,
  style: ElementStyle,
  posX: number,
  posY: number,
  zIndex: number
): CanvasElement {
  const id = generateElementId();

  const dataMap: Record<ElementType, object> = {
    pen: { points: [], smoothing: true } as PenData,
    rectangle: { borderRadius: 0 } as RectangleData,
    ellipse: {} as EllipseData,
    line: { points: [] } as LineData,
    arrow: { points: [], arrowHead: "triangle" } as ArrowData,
    image: {
      src: "",
      originalWidth: 0,
      originalHeight: 0,
      aspectRatio: 1,
    },
    text: {
      text: "",
      fontSize: 24,
      fontFamily: "Inter, sans-serif",
    },
  };

  return {
    id,
    type,
    data: dataMap[type],
    style: { ...style },
    posX,
    posY,
    width: 0,
    height: 0,
    rotation: 0,
    zIndex,
    version: 1,
  };
}

/** Finalize a pen element by computing its bounding box from points */
export function finalizePenElement(element: CanvasElement): CanvasElement {
  const data = element.data as PenData;
  if (!data.points || data.points.length === 0) return element;

  const bounds = getBoundsFromPoints(data.points);
  return {
    ...element,
    posX: bounds.x,
    posY: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

/** Finalize a line/arrow element by computing its bounding box from points */
export function finalizeLineElement(element: CanvasElement): CanvasElement {
  const data = element.data as LineData | ArrowData;
  if (!data.points || data.points.length === 0) return element;

  const bounds = getBoundsFromPoints(data.points);
  return {
    ...element,
    posX: bounds.x,
    posY: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

/** Create a shape element from drag start/end */
export function finalizeShapeElement(
  element: CanvasElement,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): CanvasElement {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const w = Math.abs(endX - startX);
  const h = Math.abs(endY - startY);

  return {
    ...element,
    posX: x,
    posY: y,
    width: w,
    height: h,
  };
}

/** Create an image element from uploaded data */
export function createImageElement(
  src: string,
  originalWidth: number,
  originalHeight: number,
  posX: number,
  posY: number,
  zIndex: number,
  style: ElementStyle
): CanvasElement {
  const maxDim = 400;
  const aspectRatio = originalWidth / originalHeight;
  let w = originalWidth;
  let h = originalHeight;

  if (w > maxDim || h > maxDim) {
    if (aspectRatio > 1) {
      w = maxDim;
      h = maxDim / aspectRatio;
    } else {
      h = maxDim;
      w = maxDim * aspectRatio;
    }
  }

  return {
    id: generateElementId(),
    type: "image",
    data: { src, originalWidth, originalHeight, aspectRatio },
    style,
    posX,
    posY,
    width: w,
    height: h,
    rotation: 0,
    zIndex,
    version: 1,
  };
}

/** Hit test: check if a world-space point hits an element */
export function hitTestElement(
  element: CanvasElement,
  worldX: number,
  worldY: number
): boolean {
  const data = element.data;

  // For pen/line/arrow — check proximity to path
  if (
    element.type === "pen" ||
    element.type === "line" ||
    element.type === "arrow"
  ) {
    const points =
      (data as PenData | LineData | ArrowData).points || [];
    const threshold = Math.max(element.style.strokeWidth * 2, 8);

    for (let i = 0; i < points.length - 1; i++) {
      const dist = distToSegment(
        worldX,
        worldY,
        points[i].x,
        points[i].y,
        points[i + 1].x,
        points[i + 1].y
      );
      if (dist < threshold) return true;
    }
    return false;
  }

  // For shapes — check bounding box
  const pad = 4;
  return (
    worldX >= element.posX - pad &&
    worldX <= element.posX + element.width + pad &&
    worldY >= element.posY - pad &&
    worldY <= element.posY + element.height + pad
  );
}

function distToSegment(
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
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
