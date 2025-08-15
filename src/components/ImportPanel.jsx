// src/components/ImportPanel.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createGame, getGame, simulateServerWork } from "../services/apiService";
import { usePoll } from "../hooks/usePoll";
import { useToast } from "./ToastProvider";

export default function ImportPanel({ onDone = () => {} }) {
  const toast = useToast();

  const [file, setFile] = useState(null);

  // idle | importing | polling | done | error
  const [phase, setPhase] = useState("idle");
  const [err, setErr] = useState("");
  const [jobId, setJobId] = useState(null);

  // prevent double submit in StrictMode / accidental double clicks
  const inFlightRef = useRef(false);

  // optimistic progress ticker (keeps UX lively until server responds)
  const [optimistic, setOptimistic] = useState(0);
  const tickerRef = useRef(null);

  const disabled = phase === "importing" || phase === "polling";

  async function handleImport() {
    if (disabled || inFlightRef.current) return;
    setErr("");

    if (!file) {
      toast?.push("Please choose a file to import", "error");
      return;
    }

    try {
      inFlightRef.current = true;
      setPhase("importing");

      // read & parse file (best effort)
      const text = await file.text();
      const parsed = safeParse(text) ?? {};

      const name =
        parsed.name ||
        file.name.replace(/\.[^.]+$/, "") ||
        `import-${Date.now()}`;

      // predictable starting document for the mock backend
      const payload = {
        name,
        status: "queued",
        progress: 0,
        // ...parsed,  // (optional) merge extra fields if you want
      };

      const created = await createGame(payload);
      const id = created?.id != null ? String(created.id) : null;
      if (!id) throw new Error("Import succeeded but no id returned.");

      setJobId(id);

      // start simulated server-side progress (mock only)
      simulateServerWork(id).catch(() => {});

      // start optimistic progress ticker
      setOptimistic(0);
      setPhase("polling");
    } catch (e) {
      console.error("[IMPORT FAIL]", e);
      setErr(e?.response?.data?.message || e?.message || "Import failed.");
      setPhase("error");
    } finally {
      inFlightRef.current = false;
    }
  }

  // optimistic ticker (runs while polling)
  useEffect(() => {
    if (phase !== "polling") {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
      return;
    }

    // tick ~every 700ms up to 95%
    tickerRef.current = setInterval(() => {
      setOptimistic((p) => (p >= 95 ? 95 : p + 3));
    }, 700);

    return () => {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    };
  }, [phase]);

  // memoized fetcher prevents render loops
  const fetchStatus = useCallback(
    (signal) => (jobId ? getGame(jobId, { signal }) : null),
    [jobId]
  );

  const { data: status, error: pollErr } = usePoll(fetchStatus, {
    enabled: phase === "polling" && !!jobId,
    interval: 3000, // friendly for MockAPI
    timeout: 180000,
    stopWhen: (s) => !!s && (s.status === "completed" || Number(s.progress) >= 100),
  });

  // merge server + optimistic progress
  const progress = useMemo(() => {
    const server = Number(status?.progress ?? 0);
    const best = Math.max(server, optimistic);
    return Number.isFinite(best) ? Math.min(100, Math.max(0, best)) : 0;
  }, [status, optimistic]);

  // finish or show errors
  useEffect(() => {
    if (pollErr && phase === "polling") {
      console.error("[IMPORT POLL ERROR]", pollErr);
      setErr(
        pollErr?.response?.data?.message || pollErr?.message || "Polling failed."
      );
      setPhase("error");
    }
  }, [pollErr, phase]);

  useEffect(() => {
    if (!status) return;
    if (status.status === "completed" || Number(status.progress) >= 100) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
      setOptimistic(100);
      setPhase("done");
      toast?.push("Game imported", "success");
      onDone?.();

      const t = setTimeout(() => {
        setPhase("idle");
        setJobId(null);
        setOptimistic(0);
        setFile(null);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [status, toast, onDone]);

  // drop the guard when leaving busy states
  useEffect(() => {
    if (phase === "idle" || phase === "done" || phase === "error") {
      inFlightRef.current = false;
    }
  }, [phase]);

  const label =
    phase === "importing"
      ? "Importing…"
      : phase === "polling"
      ? status?.status || "Processing…"
      : "";

  const cancel = () => {
    setPhase("idle");
    setJobId(null);
    setOptimistic(0);
    setErr("");
    clearInterval(tickerRef.current);
    tickerRef.current = null;
  };

  const retry = () => {
    if (!file) return;
    setPhase("idle");
    setErr("");
    handleImport();
  };

  return (
    <div className="gw-card">
      <div className="gw-card-head">
        <h3 className="gw-card-title">Import</h3>
        <button
          className="gw-btn gw-btn-dark"
          onClick={handleImport}
          disabled={!file || disabled}
          aria-busy={disabled ? "true" : "false"}
        >
          {disabled ? <span className="gw-spinner" /> : null}
          {disabled ? "Importing…" : "Import"}
        </button>
      </div>

      {/* File chooser */}
      <div className="gw-field-row">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={disabled}
        />
        <span className="gw-subtle">
          {file ? file.name : "No file chosen"}
        </span>
      </div>

      {/* Job + progress */}
      {(phase === "importing" || phase === "polling" || phase === "done") && (
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

              <div className="gw-progress-wrap" title={`${progress}%`}>
                <div className="gw-progress" style={{ width: `${progress}%` }} />
              </div>

              <div className="gw-subtle" style={{ marginTop: 4 }}>
                {(status?.status ?? "queued")} ({progress}%)
              </div>
            </>
          ) : (
            <div className="gw-error" style={{ marginTop: 8 }}>
              {String(err)}
            </div>
          )}
        </>
      )}

      {(phase === "importing" || phase === "polling") && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="gw-btn" onClick={cancel}>
            Cancel
          </button>
          <button className="gw-btn" onClick={retry} disabled={!file}>
            Retry
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="gw-toast gw-toast-success" style={{ marginTop: 10 }}>
          Imported successfully!
        </div>
      )}
    </div>
  );
}

function safeParse(txt) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}