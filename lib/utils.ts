import { nanoid } from "nanoid";

/** Generate a short room ID (12 chars) */
export function generateRoomId(): string {
  return nanoid(12);
}

/** Generate an element ID (21 chars) */
export function generateElementId(): string {
  return nanoid();
}

/** Generate a client ID for anonymous users */
export function generateClientId(): string {
  return nanoid(10);
}

/** Predefined cursor colors for collaborative users */
export const CURSOR_COLORS = [
  "#ff6b6b", // red
  "#51cf66", // green
  "#339af0", // blue
  "#fcc419", // yellow
  "#cc5de8", // purple
  "#ff922b", // orange
  "#20c997", // teal
  "#f06595", // pink
  "#845ef7", // violet
  "#22b8cf", // cyan
];

/** Get a deterministic color based on clientId */
export function getColorForClient(clientId: string): string {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash << 5) - hash + clientId.charCodeAt(i);
    hash |= 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

/** Generate a random user name */
export function generateUserName(): string {
  const adjectives = [
    "Swift",
    "Bold",
    "Calm",
    "Keen",
    "Warm",
    "Bright",
    "Cool",
    "Vivid",
  ];
  const nouns = [
    "Fox",
    "Owl",
    "Bear",
    "Wolf",
    "Hawk",
    "Lynx",
    "Deer",
    "Crow",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}`;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
