"use client";

import { useRef, useEffect, useCallback } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { renderElement, renderSelectionBox } from "@/lib/canvas/renderer";
import { screenToWorld, getVisibleBounds, boxesOverlap } from "@/lib/canvas/math";
import {
  createElement,
  finalizePenElement,
  finalizeLineElement,
  finalizeShapeElement,
  hitTestElement,
} from "@/lib/canvas/elements";
import type { CanvasElement, PenData, LineData, ArrowData, TextData, Point } from "@/types/canvas";
import { clamp } from "@/lib/utils";

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const drawingRef = useRef<CanvasElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const spaceDownRef = useRef(false);
  const dragStartRef = useRef<Point | null>(null);
  const dragOffsetRef = useRef<Map<string, Point>>(new Map());

  const resizeRef = useRef<{
    id: string;
    handle: "nw" | "ne" | "sw" | "se";
    startPos: Point;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
  } | null>(null);

  const store = useCanvasStore;

  // ─── Resize Helpers ─────────────────────────────────────
  const getHandleHit = useCallback((element: CanvasElement, worldPos: Point): "nw" | "ne" | "sw" | "se" | null => {
    const { posX, posY, width, height } = element;
    const pad = 12; // hit area padding
    const corners = [
      { type: "nw" as const, x: posX - 4, y: posY - 4 },
      { type: "ne" as const, x: posX + width + 4, y: posY - 4 },
      { type: "sw" as const, x: posX - 4, y: posY + height + 4 },
      { type: "se" as const, x: posX + width + 4, y: posY + height + 4 },
    ];

    for (const c of corners) {
      if (
        worldPos.x >= c.x - pad &&
        worldPos.x <= c.x + pad &&
        worldPos.y >= c.y - pad &&
        worldPos.y <= c.y + pad
      ) {
        return c.type;
      }
    }
    return null;
  }, []);

  // ─── Resize ─────────────────────────────────────────────

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }, []);

  // ─── Render Loop ────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const state = store.getState();
    const { viewport, elements, selectedElementIds } = state;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid (subtle dots)
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Grid dots
    const gridSize = 40;
    const visible = getVisibleBounds(
      canvas.width / dpr,
      canvas.height / dpr,
      viewport.offsetX,
      viewport.offsetY,
      viewport.zoom
    );

    const startX = Math.floor(visible.x / gridSize) * gridSize;
    const startY = Math.floor(visible.y / gridSize) * gridSize;
    const endX = visible.x + visible.width + gridSize;
    const endY = visible.y + visible.height + gridSize;

    ctx.fillStyle = "#262626";
    for (let x = startX; x < endX; x += gridSize) {
      for (let y = startY; y < endY; y += gridSize) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // Render elements (frustum culling)
    const sortedElements = Array.from(elements.values()).sort(
      (a, b) => a.zIndex - b.zIndex
    );

    for (const element of sortedElements) {
      // Skip the text element being actively edited (the textarea overlay handles it)
      if (element.id === state.editingTextId) continue;
      const elBounds = {
        x: element.posX - 10,
        y: element.posY - 10,
        width: Math.max(element.width + 20, 20),
        height: Math.max(element.height + 20, 20),
      };
      if (boxesOverlap(visible, elBounds)) {
        renderElement(ctx, element);
      }
    }

    // Render selection boxes
    for (const id of selectedElementIds) {
      const el = elements.get(id);
      if (el) renderSelectionBox(ctx, el);
    }

    // Render remote cursors
    const cursors = state.remoteCursors;
    for (const [, cursor] of cursors) {
      ctx.save();
      ctx.translate(cursor.x, cursor.y);

      // Cursor triangle
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(6, 12);
      ctx.closePath();
      ctx.fillStyle = cursor.color;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Name label
      ctx.font = "11px Inter, system-ui, sans-serif";
      const text = cursor.userName;
      const textW = ctx.measureText(text).width;
      ctx.fillStyle = cursor.color;
      ctx.beginPath();
      ctx.roundRect(8, 14, textW + 8, 18, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(text, 12, 28);

      ctx.restore();
    }

    ctx.restore();

    animFrameRef.current = requestAnimationFrame(render);
  }, [store]);

  // ─── Event Handlers ─────────────────────────────────────

  const getWorldPos = useCallback(
    (e: React.PointerEvent | PointerEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const { viewport } = store.getState();
      return screenToWorld(
        e.clientX - rect.left,
        e.clientY - rect.top,
        viewport.offsetX,
        viewport.offsetY,
        viewport.zoom
      );
    },
    [store]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const state = store.getState();
      const worldPos = getWorldPos(e);

      // Pan: middle mouse, right mouse, or space+left
      if (e.button === 1 || e.button === 2 || spaceDownRef.current) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = "grabbing";
        return;
      }

      if (e.button !== 0) return;

      const { activeTool, activeStyle, elements } = state;

      if (activeTool === "select") {
        // Check for resize handle click first if 1 element is selected
        if (state.selectedElementIds.size === 1) {
          const id = Array.from(state.selectedElementIds)[0];
          const el = elements.get(id);
          if (el) {
            const handle = getHandleHit(el, worldPos);
            if (handle) {
              state.pushUndo();
              resizeRef.current = {
                id,
                handle,
                startWidth: el.width,
                startHeight: el.height,
                startX: el.posX,
                startY: el.posY,
                startPos: worldPos,
              };
              canvas.setPointerCapture(e.pointerId);
              return;
            }
          }
        }

        // Hit test against elements (reverse order = top first)
        const sorted = Array.from(elements.values()).sort(
          (a, b) => b.zIndex - a.zIndex
        );
        let hit: CanvasElement | null = null;
        for (const el of sorted) {
          if (hitTestElement(el, worldPos.x, worldPos.y)) {
            hit = el;
            break;
          }
        }

        if (hit) {
          store.getState().selectElements([hit.id]);
          dragStartRef.current = worldPos;
          // Store offsets for all selected elements
          const selIds = store.getState().selectedElementIds;
          const offsets = new Map<string, Point>();
          for (const id of selIds) {
            const el = elements.get(id);
            if (el) {
              offsets.set(id, {
                x: worldPos.x - el.posX,
                y: worldPos.y - el.posY,
              });
            }
          }
          dragOffsetRef.current = offsets;
        } else {
          store.getState().clearSelection();
          dragStartRef.current = null;
        }
        return;
      }

      // Start drawing
      store.getState().pushUndo();

      const maxZ = Array.from(elements.values()).reduce(
        (max, el) => Math.max(max, el.zIndex),
        0
      );

      if (activeTool === "pen") {
        const el = createElement("pen", activeStyle, worldPos.x, worldPos.y, maxZ + 1);
        (el.data as PenData).points = [worldPos];
        drawingRef.current = el;
        store.getState().addElement(el);
      } else if (
        activeTool === "line" ||
        activeTool === "arrow"
      ) {
        const el = createElement(activeTool, activeStyle, worldPos.x, worldPos.y, maxZ + 1);
        const data = el.data as LineData | ArrowData;
        data.points = [worldPos, { ...worldPos }];
        drawingRef.current = el;
        store.getState().addElement(el);
      } else if (
        activeTool === "rectangle" ||
        activeTool === "ellipse"
      ) {
        const el = createElement(activeTool, activeStyle, worldPos.x, worldPos.y, maxZ + 1);
        dragStartRef.current = worldPos;
        drawingRef.current = el;
        store.getState().addElement(el);
      } else if (activeTool === "text") {
        // Create a new text element and immediately open the editor
        const el = createElement("text", activeStyle, worldPos.x, worldPos.y, maxZ + 1);
        console.log("[TEXT TOOL] Created text element:", el.id, "at", worldPos.x, worldPos.y);
        store.getState().addElement(el);
        store.getState().setEditingTextId(el.id);
        console.log("[TEXT TOOL] editingTextId set to:", store.getState().editingTextId);
        console.log("[TEXT TOOL] element exists in store:", store.getState().elements.has(el.id));
        store.getState().setActiveTool("select");
        return; // Don't capture pointer — let the textarea take focus
      }

      canvas.setPointerCapture(e.pointerId);
    },
    [store, getWorldPos, getHandleHit]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const state = store.getState();

      // Pan
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        state.setViewport({
          offsetX: state.viewport.offsetX + dx,
          offsetY: state.viewport.offsetY + dy,
        });
        return;
      }

      const worldPos = getWorldPos(e);

      // Resize
      if (resizeRef.current) {
        const { id, handle, startWidth, startHeight, startX, startY, startPos } = resizeRef.current;
        const dx = worldPos.x - startPos.x;
        const dy = worldPos.y - startPos.y;

        let newX = startX;
        let newY = startY;
        let newW = startWidth;
        let newH = startHeight;

        const el = state.elements.get(id);
        const isPreservingAspectRatio = e.shiftKey || (el && el.type === "image");
        let aspect = 1;
        if (el && isPreservingAspectRatio && startHeight !== 0) {
          aspect = startWidth / startHeight;
        }

        if (handle === "se") {
          newW = Math.max(10, startWidth + dx);
          newH = Math.max(10, startHeight + dy);
          if (isPreservingAspectRatio) {
            newH = newW / aspect;
          }
        } else if (handle === "sw") {
          newW = Math.max(10, startWidth - dx);
          newH = Math.max(10, startHeight + dy);
          if (isPreservingAspectRatio) {
            newH = newW / aspect;
          }
          newX = startX + startWidth - newW;
        } else if (handle === "ne") {
          newW = Math.max(10, startWidth + dx);
          newH = Math.max(10, startHeight - dy);
          if (isPreservingAspectRatio) {
            newH = newW / aspect;
          }
          newY = startY + startHeight - newH;
        } else if (handle === "nw") {
          newW = Math.max(10, startWidth - dx);
          newH = Math.max(10, startHeight - dy);
          if (isPreservingAspectRatio) {
            newH = newW / aspect;
          }
          newX = startX + startWidth - newW;
          newY = startY + startHeight - newH;
        }

        state.updateElement(id, {
          posX: newX,
          posY: newY,
          width: newW,
          height: newH,
        });
        return;
      }

      // Drag selected elements
      if (
        state.activeTool === "select" &&
        dragStartRef.current &&
        state.selectedElementIds.size > 0
      ) {
        for (const id of state.selectedElementIds) {
          const offset = dragOffsetRef.current.get(id);
          if (offset) {
            state.updateElement(id, {
              posX: worldPos.x - offset.x,
              posY: worldPos.y - offset.y,
            });
          }
        }
        return;
      }

      // Drawing
      const drawing = drawingRef.current;
      if (!drawing) return;

      if (drawing.type === "pen") {
        const data = drawing.data as PenData;
        data.points.push(worldPos);
        drawingRef.current = { ...drawing };
        state.updateElement(drawing.id, { data: drawingRef.current.data });
      } else if (drawing.type === "line" || drawing.type === "arrow") {
        const data = drawing.data as LineData | ArrowData;
        data.points[data.points.length - 1] = worldPos;
        drawingRef.current = { ...drawing };
        state.updateElement(drawing.id, { data: drawingRef.current.data });
      } else if (
        drawing.type === "rectangle" ||
        drawing.type === "ellipse"
      ) {
        if (dragStartRef.current) {
          const finalized = finalizeShapeElement(
            drawing,
            dragStartRef.current.x,
            dragStartRef.current.y,
            worldPos.x,
            worldPos.y
          );
          drawingRef.current = finalized;
          state.updateElement(drawing.id, {
            posX: finalized.posX,
            posY: finalized.posY,
            width: finalized.width,
            height: finalized.height,
          });
        }
      }
    },
    [store, getWorldPos]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;

      if (isPanningRef.current) {
        isPanningRef.current = false;
        if (canvas) {
          canvas.style.cursor = spaceDownRef.current ? "grab" : "default";
        }
        return;
      }

      if (resizeRef.current) {
        resizeRef.current = null;
        if (canvas) canvas.releasePointerCapture(e.pointerId);
        return;
      }

      // Finish drag
      if (store.getState().activeTool === "select" && dragStartRef.current) {
        dragStartRef.current = null;
        dragOffsetRef.current = new Map();
        return;
      }

      // Commit drawing
      const drawing = drawingRef.current;
      if (!drawing) return;

      let finalized = drawing;
      if (drawing.type === "pen") {
        finalized = finalizePenElement(drawing);
      } else if (drawing.type === "line" || drawing.type === "arrow") {
        finalized = finalizeLineElement(drawing);
      }

      // Only add if it has some size
      if (
        finalized.type === "pen" &&
        (finalized.data as PenData).points.length >= 1
      ) {
        store.getState().addElement(finalized);
      } else if (
        (finalized.type === "line" || finalized.type === "arrow") &&
        (finalized.data as LineData).points.length >= 2
      ) {
        store.getState().addElement(finalized);
      } else if (
        (finalized.type === "rectangle" || finalized.type === "ellipse") &&
        finalized.width > 2 &&
        finalized.height > 2
      ) {
        store.getState().addElement(finalized);
      }

      drawingRef.current = null;
      dragStartRef.current = null;

      if (canvas) canvas.releasePointerCapture(e.pointerId);
    },
    [store]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const state = store.getState();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom toward cursor
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = clamp(state.viewport.zoom * zoomFactor, 0.1, 5.0);

      const worldBefore = screenToWorld(
        mouseX,
        mouseY,
        state.viewport.offsetX,
        state.viewport.offsetY,
        state.viewport.zoom
      );
      const worldAfter = screenToWorld(
        mouseX,
        mouseY,
        state.viewport.offsetX,
        state.viewport.offsetY,
        newZoom
      );

      state.setViewport({
        zoom: newZoom,
        offsetX:
          state.viewport.offsetX + (worldAfter.x - worldBefore.x) * newZoom,
        offsetY:
          state.viewport.offsetY + (worldAfter.y - worldBefore.y) * newZoom,
      });
    },
    [store]
  );

  // ─── Keyboard ───────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keyboard events while editing text
      if (store.getState().editingTextId) return;

      if (e.code === "Space" && !e.repeat) {
        spaceDownRef.current = true;
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          store.getState().redo();
        } else {
          store.getState().undo();
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const state = store.getState();
        if (state.selectedElementIds.size > 0) {
          state.pushUndo();
          for (const id of state.selectedElementIds) {
            state.deleteElement(id);
          }
        }
      }
      // Tool shortcuts
      if (!e.metaKey && !e.ctrlKey) {
        switch (e.key) {
          case "v":
          case "V":
            store.getState().setActiveTool("select");
            break;
          case "p":
          case "P":
            store.getState().setActiveTool("pen");
            break;
          case "t":
          case "T":
            store.getState().setActiveTool("text");
            break;
          case "r":
          case "R":
            store.getState().setActiveTool("rectangle");
            break;
          case "o":
          case "O":
            store.getState().setActiveTool("ellipse");
            break;
          case "l":
          case "L":
            store.getState().setActiveTool("line");
            break;
          case "a":
          case "A":
            store.getState().setActiveTool("arrow");
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDownRef.current = false;
        if (canvasRef.current && !isPanningRef.current) {
          canvasRef.current.style.cursor = "default";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [store]);

  // ─── Init ───────────────────────────────────────────────

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    animFrameRef.current = requestAnimationFrame(render);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
      if (canvas) {
        canvas.removeEventListener("wheel", handleWheel);
      }
    };
  }, [resize, render, handleWheel]);

  // Prevent context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Double-click to re-edit existing text
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const state = store.getState();
      if (state.activeTool !== "select") return;

      const rect = canvas.getBoundingClientRect();
      const worldPos = screenToWorld(
        e.clientX - rect.left,
        e.clientY - rect.top,
        state.viewport.offsetX,
        state.viewport.offsetY,
        state.viewport.zoom
      );
      const sorted = Array.from(state.elements.values()).sort(
        (a, b) => b.zIndex - a.zIndex
      );

      for (const el of sorted) {
        if (el.type === "text" && hitTestElement(el, worldPos.x, worldPos.y)) {
          state.setEditingTextId(el.id);
          break;
        }
      }
    },
    [store]
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        id="whiteboard-canvas"
        className="w-full h-full block touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
}
