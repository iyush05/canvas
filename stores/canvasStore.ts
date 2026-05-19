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

  // Viewport state (infinite canvas)
  viewport: Viewport;

  // Collaboration
  remoteCursors: Map<string, CursorPosition>;
  isSharedMode: boolean;
  roomId: string | null;

  // History (undo/redo)
  undoStack: Map<string, CanvasElement>[];
  redoStack: Map<string, CanvasElement>[];

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

  // Actions — Viewport
  setViewport: (viewport: Partial<Viewport>) => void;

  // Actions — Collaboration
  setRemoteCursor: (cursor: CursorPosition) => void;
  removeRemoteCursor: (clientId: string) => void;
  setSharedMode: (roomId: string) => void;

  // Actions — History
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  // Helpers
  getElementsArray: () => CanvasElement[];
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
    set({ selectedElementIds: new Set() });
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

  // ─── History Actions ────────────────────────────────────

  pushUndo: () => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-49), new Map(state.elements)],
      redoStack: [],
    }));
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;
    const prev = state.undoStack[state.undoStack.length - 1];
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, new Map(state.elements)],
      elements: prev,
    });
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    const next = state.redoStack[state.redoStack.length - 1];
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, new Map(state.elements)],
      elements: next,
    });
  },

  // ─── Helpers ────────────────────────────────────────────

  getElementsArray: () => {
    return Array.from(get().elements.values()).sort(
      (a, b) => a.zIndex - b.zIndex
    );
  },
}));
