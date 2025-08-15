import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import CreatePanel from "./components/CreatePanel";
import ImportPanel from "./components/ImportPanel";
import ListPanel from "./components/ListPanel";

import ToastProvider, { useToast } from "./components/ToastProvider";
import { listGames, deleteGame } from "./services/apiService";

// Keep ToastProvider at the top; AppBody uses the toast.
export default function App() {
  return (
    <ToastProvider>
      <AppBody />
    </ToastProvider>
  );
}

function AppBody() {
  const toast = useToast();

  // ---- Lifted list state ----
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadErr("");
    try {
      const data = await listGames();
      setGames(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[LIST REFRESH]", e);
      setLoadErr(e?.message || "Failed to load list");
      toast?.push("Failed to load list", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // auto-refresh while there are active jobs
  const autoTimerRef = useRef(null);
  const hasActive = useMemo(
    () => games.some((g) => (g.status !== "completed") || Number(g.progress) < 100),
    [games]
  );

  useEffect(() => {
    clearInterval(autoTimerRef.current);
    if (!hasActive) return;
    autoTimerRef.current = setInterval(() => {
      refresh();
    }, 5000); // poll list every 5s while jobs are active
    return () => clearInterval(autoTimerRef.current);
  }, [hasActive, refresh]);

  const handleDelete = useCallback(
    async (id) => {
      if (!id) return;
      const ok = window.confirm("Delete this game?");
      if (!ok) return;

      try {
        await deleteGame(String(id));
        setGames((rows) => rows.filter((r) => String(r.id) !== String(id)));
        toast?.push("Deleted", "success");
      } catch (e) {
        console.error("[DELETE]", e);
        toast?.push("Delete failed", "error");
      }
    },
    [toast]
  );

  // When a job completes from Create/Import we do a single refresh.
  const onJobDone = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="gw-container">
      <div
        className="gw-breadcrumbs"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>
          <b>Game Wizard</b> · create / import → poll status → show progress & success
        </span>
      </div>

      <CreatePanel onDone={onJobDone} />
      <ImportPanel onDone={onJobDone} />

      <ListPanel
        games={games}
        loading={loading}
        error={loadErr}
        onRefresh={refresh}
        onDelete={handleDelete}
      />
    </div>
  );
}