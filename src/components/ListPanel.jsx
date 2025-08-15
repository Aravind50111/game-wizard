import React, { useMemo, useState } from "react";

export default function ListPanel({
  games = [],
  loading = false,
  error = "",
  onRefresh,
  onDelete,
}) {
  const [deletingId, setDeletingId] = useState(null);

  // group active (queued/processing/<100%) vs completed
  const { active, completed } = useMemo(() => {
    const a = [];
    const c = [];
    for (const g of games || []) {
      const prog = Number.isFinite(+g.progress) ? +g.progress : 0;
      if ((g.status && g.status !== "completed") || prog < 100) a.push(g);
      else c.push(g);
    }
    // active newest first, completed newest first (MockAPI ids increase)
    a.sort((x, y) => Number(y.id) - Number(x.id));
    c.sort((x, y) => Number(y.id) - Number(x.id));
    return { active: a, completed: c };
  }, [games]);

  const hasItems = (active.length + completed.length) > 0;

  const handleDelete = async (id) => {
    if (!onDelete || !id) return;
    try {
      setDeletingId(String(id));
      await onDelete(String(id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="gw-card">
      <div className="gw-card-head">
        <h3 className="gw-card-title">All Games</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {error ? (
            <button className="gw-btn gw-btn-danger" onClick={onRefresh} disabled={loading}>
              {loading ? <span className="gw-spinner" /> : "Retry"}
            </button>
          ) : null}
          <button className="gw-btn" onClick={onRefresh} disabled={loading}>
            {loading ? <span className="gw-spinner" /> : null}
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? <div className="gw-error" style={{ marginTop: 8 }}>{error}</div> : null}

      {!loading && !hasItems && !error ? (
        <div className="gw-subtle">No games yet.</div>
      ) : null}

      {/* ACTIVE SECTION */}
      {active.length > 0 && (
        <>
          <SectionHeader title="Active" />
          <ul className="gw-list">
            {active.map((g) => (
              <Row
                key={g.id}
                g={g}
                deletingId={deletingId}
                onDelete={handleDelete}
                isActive
              />
            ))}
          </ul>
        </>
      )}

      {/* COMPLETED SECTION */}
      {completed.length > 0 && (
        <>
          <SectionHeader title="Completed" subtle />
          <ul className="gw-list">
            {completed.map((g) => (
              <Row
                key={g.id}
                g={g}
                deletingId={deletingId}
                onDelete={handleDelete}
                isActive={false}
              />
            ))}
          </ul>
        </>
      )}

      {/* skeleton for first load */}
      {loading && !hasItems && (
        <div style={{ marginTop: 12 }}>
          <div className="gw-skel skel-row" />
          <div className="gw-skel skel-row" />
          <div className="gw-skel skel-row" />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, subtle = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 6px" }}>
      <span className="gw-subtle" style={{ fontWeight: subtle ? 500 : 700 }}>
        {title}
      </span>
      <div style={{ height: 1, background: "var(--line)", flex: 1 }} />
    </div>
  );
}

function Row({ g, deletingId, onDelete, isActive }) {
  const id = String(g.id);
  const status = (g.status || "queued").toLowerCase();
  const progress = Number.isFinite(+g.progress) ? Math.min(100, Math.max(0, +g.progress)) : 0;
  const deleting = deletingId === id;

  return (
    <li className="gw-list-item">
      <div className="gw-list-main">
        <div className="gw-list-title">
          {iconFor(status)} {g.name || "—"}
        </div>

        <div className="gw-list-meta">
          id: {id} · <StatusChip status={status} /> · {progress}%
        </div>

        {/* tiny animated progress bar */}
        <div
          className={`gw-progress-wrap thin ${isActive ? "indeterminate" : ""}`}
          title={`${progress}%`}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="gw-progress" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="gw-list-actions">
        <button
          className="gw-btn gw-btn-danger"
          onClick={() => onDelete?.(id)}
          disabled={deleting}
          aria-busy={deleting ? "true" : "false"}
        >
          {deleting ? <span className="gw-spinner" /> : null}
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </li>
  );
}

function StatusChip({ status = "queued" }) {
  const cls = {
    queued: "gw-chip-sm gw-chip-queued",
    processing: "gw-chip-sm gw-chip-processing",
    completed: "gw-chip-sm gw-chip-completed",
    failed: "gw-chip-sm gw-chip-failed",
  }[status] || "gw-chip-sm gw-chip-queued";
  return <span className={cls}>{status}</span>;
}

function iconFor(status) {
  switch (status) {
    case "completed":
      return <span aria-hidden>✅</span>;
    case "processing":
      return <span aria-hidden>⚙️</span>;
    case "failed":
      return <span aria-hidden>❌</span>;
    default:
      return <span aria-hidden>⏳</span>;
  }
}