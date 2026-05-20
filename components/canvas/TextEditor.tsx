"use client";

import { useRef, useEffect, useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import type { TextData } from "@/types/canvas";

export default function TextEditor() {
  const editingTextId = useCanvasStore((s) => s.editingTextId);
  const viewport = useCanvasStore((s) => s.viewport);
  const elements = useCanvasStore((s) => s.elements);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const store = useCanvasStore;

  const editingElement = editingTextId ? elements.get(editingTextId) : null;

  // When editingTextId changes, mark as ready after a tick
  // This prevents React Strict Mode double-mount from causing issues
  useEffect(() => {
    if (editingTextId) {
      const timer = setTimeout(() => {
        setReady(true);
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setReady(false);
    }
  }, [editingTextId]);

  // Click-outside detection: commit text when user clicks outside the textarea
  useEffect(() => {
    if (!editingTextId || !ready) return;

    const handlePointerDown = (e: PointerEvent) => {
      // If clicking outside the textarea container, commit
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commitText();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        commitText();
      }
    };

    // Delay attaching the listener to avoid catching the creating click
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", handlePointerDown, true);
      window.addEventListener("keydown", handleKeyDown);
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingTextId, ready]);

  const commitText = () => {
    const el = store.getState().elements.get(editingTextId!);
    if (!el) {
      store.getState().setEditingTextId(null);
      return;
    }
    const td = el.data as TextData;
    const val = textareaRef.current?.value ?? "";

    if (!val.trim()) {
      store.getState().deleteElement(editingTextId!);
    } else {
      // Measure text dimensions
      const measureCanvas = document.createElement("canvas");
      const ctx = measureCanvas.getContext("2d");
      let maxWidth = 100;
      const lines = val.split("\n");
      if (ctx) {
        ctx.font = `${td.fontSize}px ${td.fontFamily}`;
        for (const line of lines) {
          const w = ctx.measureText(line).width;
          if (w > maxWidth) maxWidth = w;
        }
      }
      store.getState().updateElement(editingTextId!, {
        data: { ...td, text: val },
        width: maxWidth,
        height: lines.length * td.fontSize * 1.2,
      });
    }
    store.getState().setEditingTextId(null);
  };

  if (!editingTextId || !editingElement || editingElement.type !== "text") {
    return null;
  }

  const td = editingElement.data as TextData;

  return (
    <div
      ref={containerRef}
      className="absolute"
      style={{
        left: `${editingElement.posX * viewport.zoom + viewport.offsetX}px`,
        top: `${editingElement.posY * viewport.zoom + viewport.offsetY}px`,
        zIndex: 9999,
      }}
    >
      <textarea
        ref={textareaRef}
        autoFocus
        className="outline-none resize-none overflow-hidden whitespace-pre pointer-events-auto rounded-lg"
        style={{
          color: editingElement.style.strokeColor,
          fontFamily: td.fontFamily,
          fontSize: `${td.fontSize * viewport.zoom}px`,
          lineHeight: "1.2",
          minWidth: "120px",
          minHeight: "44px",
          padding: "8px 10px",
          caretColor: editingElement.style.strokeColor,
          background: "rgba(30, 30, 35, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow:
            "0 0 0 2px rgba(99, 102, 241, 0.4), 0 8px 24px rgba(0, 0, 0, 0.4)",
        }}
        defaultValue={td.text}
        onKeyDown={(e) => {
          // Stop ALL key events from propagating to canvas shortcuts
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}
