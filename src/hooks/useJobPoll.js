// src/hooks/useJobPoll.js
import { useEffect, useRef, useState } from "react";
import { getStatus } from "../services/apiService";

export function useJobPoll(jobId, intervalMs = 1000, timeoutMs = 120000) {
  const [state, setState] = useState("idle");   // idle | running | done | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const startedAt = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!jobId) return;
    setState("running");
    setError("");
    setProgress(0);
    startedAt.current = Date.now();

    timer.current = setInterval(async () => {
      try {
        const s = await getStatus(jobId);
        // Expect shape: { state: "running|done|error", progress: 0..100 }
        if (typeof s.progress === "number") setProgress(s.progress);
        if (s.state === "done") { setState("done"); clear(); }
        else if (s.state === "error") { setState("error"); setError(s.message || "Job failed"); clear(); }
        else setState("running");
      } catch (e) {
        setState("error");
        setError(e?.response?.data?.message || e?.message || "Status failed");
        clear();
      }
      if (Date.now() - startedAt.current > timeoutMs) {
        setState("error");
        setError("Timed out");
        clear();
      }
    }, intervalMs);

    return () => clear();
  }, [jobId, intervalMs, timeoutMs]);

  function clear() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }

  return { state, progress, error, resetError: () => setError("") };
}
