// src/hooks/usePoll.js
import { useEffect, useRef, useState } from "react";

/**
 * Polls an async function with exponential backoff on 429/503,
 * optional Retry-After support, jitter, and *clears data when it restarts*.
 * The function `fn` may optionally accept an AbortSignal: fn(signal).
 */
export function usePoll(
  fn,
  {
    enabled = true,
    interval = 3000,
    maxInterval = 15000,
    backoffFactor = 1.8,
    jitterMs = 250,
    timeout = 120000,
    stopWhen,
    backoffStatuses = [429, 503],
  } = {}
) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  const timerRef = useRef(null);
  const startedRef = useRef(0);
  const curIntervalRef = useRef(interval);
  const abortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      // create a fresh abort controller per request
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await (typeof fn === "function" ? fn(ac.signal) : null);
        if (cancelled) return;

        setData(res);
        // reset interval on success
        curIntervalRef.current = interval;

        if (stopWhen?.(res)) {
          setRunning(false);
          return;
        }

        if (Date.now() - startedRef.current > timeout) {
          throw new Error("Polling timed out");
        }
      } catch (e) {
        if (cancelled) return;

        // ignore aborts as "errors"
        if (e?.name === "AbortError") {
          return;
        }

        const status = e?.response?.status;

        if (backoffStatuses.includes(status)) {
          // respect Retry-After if present
          const h =
            e?.response?.headers?.["retry-after"] ??
            e?.response?.headers?.["Retry-After"];
          const retryAfterMs = h ? parseInt(String(h), 10) * 1000 : 0;

          const next =
            retryAfterMs ||
            Math.min(maxInterval, Math.ceil(curIntervalRef.current * backoffFactor));

          curIntervalRef.current = next;
        } else {
          setError(e);
          setRunning(false);
          return;
        }
      }

      // jitter
      const j = Math.floor(Math.random() * jitterMs) - Math.floor(jitterMs / 2);
      const delay = Math.max(0, curIntervalRef.current + j);

      timerRef.current = setTimeout(tick, delay);
    }

    // If disabled or fn missing, stop & don't touch state
    if (!enabled || !fn) {
      setRunning(false);
      return () => {};
    }

    // ---- RESTART: clear state for a new poll session ----
    setData(null);
    setError(null);
    setRunning(true);
    startedRef.current = Date.now();
    curIntervalRef.current = interval;
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [
    enabled,
    fn,
    interval,
    maxInterval,
    backoffFactor,
    jitterMs,
    timeout,
    stopWhen,
    backoffStatuses,
  ]);

  return { data, error, running };
}