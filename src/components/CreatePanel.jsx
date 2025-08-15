// src/components/CreatePanel.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { createGame, getGame, simulateServerWork } from "../services/apiService";
import { usePoll } from "../hooks/usePoll";

export default function CreatePanel({ onDone = () => {} }) {
  const [name, setName] = useState("");
  const [jobId, setJobId] = useState(null);

  // idle | creating | polling | done | error
  const [phase, setPhase] = useState("idle");
  const [err, setErr] = useState("");

  // prevent double-submit & handle auto-reset race
  const inFlightRef = useRef(false);
  const resetTimerRef = useRef(null);
  const notifiedForIdRef = useRef(null);

  // --- optimistic progress while waiting for server ---
  const [optProgress, setOptProgress] = useState(0);
  const tickerRef = useRef(null);

  const disabled = phase === "creating" || phase === "polling";

  // start / stop optimistic ticker
  const startTicker = useCallback(() => {
    clearInterval(tickerRef.current);
    setOptProgress(1); // start from a visible value
    tickerRef.current = setInterval(() => {
      setOptProgress((p) => (p < 95 ? p + 2 : 95)); // crawl to 95%
    }, 400);
  }, []);

  const stopTicker = useCallback(() => {
    clearInterval(tickerRef.current);
    tickerRef.current = null;
  }, []);

  async function handleCreate() {
    if (inFlightRef.current || disabled) return;
    setErr("");

    // cancel any pending auto-reset from a previous job
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Please enter a game name.");
      return;
    }

    try {
      inFlightRef.current = true;
      setPhase("creating");

      const payload = { name: trimmed, status: "queued", progress: 0 };
      const created = await createGame(payload);
      const id = created?.id != null ? String(created.id) : null;
      if (!id) throw new Error("Create succeeded but no id returned.");

      setJobId(id);
      notifiedForIdRef.current = null;

      // start optimistic bar movement immediately
      startTicker();

      // demo-only server progress; remove when backend does this
      simulateServerWork(id).catch((e) =>
        console.warn("simulateServerWork failed (non-fatal)", e)
      );

      setPhase("polling");
    } catch (e) {
      console.error("[CREATE FAIL]", e);
      setErr(e?.response?.data?.message || e?.message || "Create failed.");
      setPhase("error");
    } finally {
      inFlightRef.current = false;
    }
  }

  // poll for real status (abortable)
  const fetchStatus = useCallback(
    (signal) => (jobId ? getGame(jobId, { signal }) : null),
    [jobId]
  );

  const { data: status, error: pollErr } = usePoll(fetchStatus, {
    enabled: phase === "polling" && !!jobId,
    interval: 2500,          // a bit snappier; OK with our throttle
    timeout: 180000,
    stopWhen: (s) => !!s && (s.status === "completed" || Number(s.progress) >= 100),
  });

  // if server says we’re ahead of optimistic, snap forward
  useEffect(() => {
    if (status?.progress != null) {
      setOptProgress((p) => Math.max(p, Number(status.progress) || 0));
    }
  }, [status?.progress]);

  // handle polling errors that aren’t backoff-able
  useEffect(() => {
    if (pollErr && phase === "polling") {
      console.error("[POLL ERROR]", pollErr);
      setErr(pollErr?.response?.data?.message || pollErr?.message || "Polling failed.");
      setPhase("error");
      stopTicker();
    }
  }, [pollErr, phase, stopTicker]);

  // finish flow once done
  useEffect(() => {
    if (!status || phase !== "polling") return;
    const done = status.status === "completed" || Number(status.progress) >= 100;
    if (!done || !jobId) return;

    if (notifiedForIdRef.current === jobId) return;
    notifiedForIdRef.current = jobId;

    stopTicker();
    setOptProgress(100);
    setPhase("done");
    onDone();

    resetTimerRef.current = setTimeout(() => {
      setPhase("idle");
      setJobId(null);
      setName("");
      setOptProgress(0);
      notifiedForIdRef.current = null;
      resetTimerRef.current = null;
    }, 800);

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, [status, jobId, phase, onDone, stopTicker]);

  // safety: clear ticker when leaving busy states
  useEffect(() => {
    if (phase === "idle" || phase === "done" || phase === "error") {
      inFlightRef.current = false;
      stopTicker();
      if (phase !== "polling") setOptProgress(0);
    }
  }, [phase, stopTicker]);

  const progress = useMemo(() => {
    // show whichever is higher: optimistic or server progress
    const server = Number(status?.progress ?? 0);
    const v = Math.max(server, optProgress);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
  }, [status?.progress, optProgress]);

  const label =
    phase === "creating"
      ? "Creating…"
      : phase === "polling"
      ? status?.status || "Processing…"
      : "";

  const cancel = () => {
    setPhase("idle");
    setJobId(null);
    setErr("");
    setOptProgress(0);
    stopTicker();
  };

  const retry = () => {
    setPhase("idle");
    setErr("");
    stopTicker();
    setOptProgress(0);
    handleCreate();
  };

  return (
    <div className="gw-card">
      <div className="gw-card-head">
        <h3 className="gw-card-title">Create</h3>
        <button
          className="gw-btn gw-btn-dark"
          onClick={handleCreate}
          disabled={disabled}
          aria-busy={disabled ? "true" : "false"}
        >
          {disabled ? <span className="gw-spinner" /> : null}
          {disabled ? "Creating…" : "Create"}
        </button>
      </div>

      <div className="gw-field-row">
        <input
          className="gw-input"
          placeholder="Enter game name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
      </div>

      {(phase === "creating" || phase === "polling" || phase === "done") && (
        <div className="gw-subtle" style={{ marginTop: 6 }}>
          Job: {jobId ?? "—"}
        </div>
      )}

      {phase !== "idle" && (
        <>
          {phase !== "error" ? (
            <>
              <div className="gw-subtle" style={{ marginTop: 8 }}>
                {label || "queued"}
              </div>

              {/* progress bar */}
              <div className="gw-progress-wrap" title={`${Math.round(progress)}%`}>
                <div className="gw-progress" style={{ width: `${progress}%` }} />
              </div>

              <div className="gw-subtle" style={{ marginTop: 4 }}>
                {(status?.status ?? "queued")} ({Math.round(progress)}%)
              </div>
            </>
          ) : (
            <div className="gw-error" style={{ marginTop: 8 }}>
              {String(err)}
            </div>
          )}
        </>
      )}

      {(phase === "creating" || phase === "polling") && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="gw-btn" onClick={cancel}>
            Cancel
          </button>
          <button className="gw-btn" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="gw-toast gw-toast-success" style={{ marginTop: 10 }}>
          Created successfully!
        </div>
      )}
    </div>
  );
}