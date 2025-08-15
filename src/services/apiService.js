// src/services/apiService.js
import axios from "axios";

// Your MockAPI collection (no trailing slash)
export const GAMES_URL =
  "https://689b95b558a27b18087bb9c4.mockapi.io/games/games";

const api = axios.create({
  baseURL: GAMES_URL.replace(/\/$/, ""),
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Throttle to avoid 429 / socket pressure
let lastTs = 0;
api.interceptors.request.use(async (config) => {
  const MIN_GAP = 900; // raise to 1200 if you still see 429
  const now = Date.now();
  const wait = Math.max(0, lastTs + MIN_GAP - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastTs = Date.now();
  return config;
});

// ---- CRUD (optional AbortSignal via opts.signal) ----
export const createGame = (payload, opts = {}) =>
  api.post("", payload, { signal: opts.signal }).then((r) => r.data);

export const importGame = (payload, opts = {}) =>
  api.post("", payload, { signal: opts.signal }).then((r) => r.data);

export const getGame = (id, opts = {}) =>
  api.get(`/${id}`, { signal: opts.signal }).then((r) => r.data);

export const updateGame = (id, patch, opts = {}) =>
  api.put(`/${id}`, patch, { signal: opts.signal }).then((r) => r.data);

export const listGames = (opts = {}) =>
  api.get("", { signal: opts.signal }).then((r) => r.data);

export const deleteGame = (id, opts = {}) =>
  api.delete(`/${id}`, { signal: opts.signal }).then((r) => r.data);

// ---- Demo helper: simulate server-side progress on MockAPI ----
export async function simulateServerWork(id) {
  // start at processing 0%
  try { await updateGame(id, { status: "processing", progress: 0 }); } catch {}

  // step progress up — adjust timings as you like
  const steps = [8, 20, 35, 55, 75, 92, 100];
  for (const p of steps) {
    await sleep(800); // wait between steps
    await updateGame(id, {
      progress: p,
      status: p >= 100 ? "completed" : "processing",
    });
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
