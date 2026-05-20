import { create } from "zustand";
import type {
  CanvasElement,
  Tool,
  ElementStyle,
  Viewport,
  CursorPosition,
} from "@/types/canvas";
import { DEFAULT_STYLE, DEFAULT_VIEWPORT } from "@/types/canvas";
import { generateClientId, generateUserName, getColorForClient } from "@/lib/utils";

// ─── Undo Operation Types ───────────────────────────────────
// Instead of storing full canvas snapshots, we store the specific
// operation that was performed so undo only reverses THAT action.

type UndoOp =
  | { kind: "add"; elementId: string }                          // undo = delete it
  | { kind: "delete"; element: CanvasElement }                  // undo = re-add it
  | { kind: "update"; elementId: string; prev: CanvasElement }  // undo = restore prev
  | { kind: "batch"; ops: UndoOp[] };                           // undo = reverse all

// ─── State Types ────────────────────────────────────────────

interface CanvasState {
  // Identity
  clientId: string;
  userName: string;
  userColor: string;

  // Tool state
  activeTool: Tool;
  activeStyle: ElementStyle;

  // Scene state
  elements: Map<string, CanvasElement>;
  selectedElementIds: Set<string>;
  editingTextId: string | null;

  // Viewport state (infinite canvas)
  viewport: Viewport;

  // Collaboration
  remoteCursors: Map<string, CursorPosition>;
  isSharedMode: boolean;
  roomId: string | null;

  // History (undo/redo) — operation-based
  undoStack: UndoOp[];
  redoStack: UndoOp[];

  // Actions — Tool
  setActiveTool: (tool: Tool) => void;
  setActiveStyle: (style: Partial<ElementStyle>) => void;

  // Actions — Elements
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, changes: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  loadElements: (elements: CanvasElement[]) => void;

  // Actions — Selection
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  setEditingTextId: (id: string | null) => void;

  // Actions — Viewport
  setViewport: (viewport: Partial<Viewport>) => void;

  // Actions — Collaboration
  setRemoteCursor: (cursor: CursorPosition) => void;
  removeRemoteCursor: (clientId: string) => void;
  setSharedMode: (roomId: string) => void;

  // Actions — History
  pushUndo: (op: UndoOp) => void;
  undo: () => void;
  redo: () => void;

  // Helpers
  getElementsArray: () => CanvasElement[];
}

// ─── Inverse Helper ─────────────────────────────────────────
// Applies the inverse of an operation and returns the redo op

function applyInverse(
  op: UndoOp,
  elements: Map<string, CanvasElement>
): { elements: Map<string, CanvasElement>; inverseOp: UndoOp } {
  const next = new Map(elements);

  switch (op.kind) {
    case "add": {
      // Undo an add → delete it; inverse = re-add it
      const el = next.get(op.elementId);
      if (el) {
        next.delete(op.elementId);
        return { elements: next, inverseOp: { kind: "delete", element: el } };
      }
      return { elements: next, inverseOp: op };
    }
    case "delete": {
      // Undo a delete → re-add it; inverse = delete it
      next.set(op.element.id, op.element);
      return { elements: next, inverseOp: { kind: "add", elementId: op.element.id } };
    }
    case "update": {
      // Undo an update → restore prev; inverse = store current
      const current = next.get(op.elementId);
      next.set(op.elementId, op.prev);
      return {
        elements: next,
        inverseOp: { kind: "update", elementId: op.elementId, prev: current || op.prev },
      };
    }
    case "batch": {
      // Undo batch → undo all ops in reverse order
      let els = next;
      const inverseOps: UndoOp[] = [];
      for (let i = op.ops.length - 1; i >= 0; i--) {
        const result = applyInverse(op.ops[i], els);
        els = result.elements;
        inverseOps.unshift(result.inverseOp);
      }
      return { elements: els, inverseOp: { kind: "batch", ops: inverseOps } };
    }
  }
}

// ─── Store ──────────────────────────────────────────────────

const clientId = generateClientId();
const userColor = getColorForClient(clientId);

const userName = typeof window !== "undefined"
  ? (sessionStorage.getItem("canvas-user-name") ?? (() => {
    const name = generateUserName();
    sessionStorage.setItem("canvas-user-name", name);
    return name;
  })())
  : generateUserName();

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Identity
  clientId,
  userName,
  userColor,

  // Tool state
  activeTool: "pen",
  activeStyle: { ...DEFAULT_STYLE, strokeColor: userColor },

  // Scene state
  elements: new Map(),
  selectedElementIds: new Set(),
  editingTextId: null,

  // Viewport
  viewport: { ...DEFAULT_VIEWPORT },

  // Collaboration
  remoteCursors: new Map(),
  isSharedMode: false,
  roomId: null,

  // History
  undoStack: [],
  redoStack: [],

  // ─── Tool Actions ───────────────────────────────────────

  setActiveTool: (tool) => {
    set({ activeTool: tool, selectedElementIds: new Set() });
  },

  setActiveStyle: (style) => {
    set((state) => ({
      activeStyle: { ...state.activeStyle, ...style },
    }));
  },

  // ─── Element Actions ────────────────────────────────────

  addElement: (element) => {
    set((state) => {
      const next = new Map(state.elements);
      next.set(element.id, element);
      return { elements: next };
    });
  },

  updateElement: (id, changes) => {
    set((state) => {
      const existing = state.elements.get(id);
      if (!existing) return state;
      const next = new Map(state.elements);
      next.set(id, { ...existing, ...changes, version: existing.version + 1 });
      return { elements: next };
    });
  },

  deleteElement: (id) => {
    set((state) => {
      const next = new Map(state.elements);
      next.delete(id);
      const selectedIds = new Set(state.selectedElementIds);
      selectedIds.delete(id);
      return { elements: next, selectedElementIds: selectedIds };
    });
  },

  loadElements: (elements) => {
    const map = new Map<string, CanvasElement>();
    elements.forEach((el) => map.set(el.id, el));
    set({ elements: map });
  },

  // ─── Selection Actions ──────────────────────────────────

  selectElements: (ids) => {
    set({ selectedElementIds: new Set(ids) });
  },

  clearSelection: () => {
    set({ selectedElementIds: new Set(), editingTextId: null });
  },

  setEditingTextId: (id) => {
    set({ editingTextId: id, selectedElementIds: new Set() });
  },

  // ─── Viewport Actions ──────────────────────────────────

  setViewport: (viewport) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    }));
  },

  // ─── Collaboration Actions ─────────────────────────────

  setRemoteCursor: (cursor) => {
    set((state) => {
      const next = new Map(state.remoteCursors);
      next.set(cursor.clientId, cursor);
      return { remoteCursors: next };
    });
  },

  removeRemoteCursor: (clientIdToRemove) => {
    set((state) => {
      const next = new Map(state.remoteCursors);
      next.delete(clientIdToRemove);
      return { remoteCursors: next };
    });
  },

  setSharedMode: (roomId) => {
    set({ isSharedMode: true, roomId });
  },

  // ─── History Actions (operation-based) ──────────────────

  pushUndo: (op) => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-49), op],
      redoStack: [],
    }));
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;
    const op = state.undoStack[state.undoStack.length - 1];
    const result = applyInverse(op, state.elements);
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, result.inverseOp],
      elements: result.elements,
    });
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    const op = state.redoStack[state.redoStack.length - 1];
    const result = applyInverse(op, state.elements);
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, result.inverseOp],
      elements: result.elements,
    });
  },

  // ─── Helpers ────────────────────────────────────────────

  getElementsArray: () => {
    return Array.from(get().elements.values()).sort(
      (a, b) => a.zIndex - b.zIndex
    );
  },
}));
