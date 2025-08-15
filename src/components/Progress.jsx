import React from "react";

export default function Progress({ value = 0, label, status }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#334155", fontWeight: 600 }}>{label ?? "Progress"}</span>
        <span style={{ color: "#334155", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
      </div>
      <div className="gw-bar">
        <div className="gw-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {status && (
        <div style={{ marginTop: 6, color: "#475569", fontSize: 13 }}>{status}</div>
      )}
    </div>
  );
}
