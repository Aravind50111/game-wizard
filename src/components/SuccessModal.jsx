import React from "react";

export default function SuccessModal({ open, title, subtitle, onClose, actionText = "Done" }) {
  if (!open) return null;
  return (
    <div className="gw-modal" role="dialog" aria-modal="true" aria-label="Success">
      <div className="gw-modal-card">
        <div className="gw-badge">
          <span className="gw-check" />
          Success
        </div>
        <h3 className="gw-modal-title" style={{ marginTop: 10 }}>{title}</h3>
        {subtitle && <p style={{ color: "#475569", margin: "6px 0 14px" }}>{subtitle}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="gw-btn" onClick={onClose}>Close</button>
          <button className="gw-btn gw-btn-dark" onClick={onClose}>{actionText}</button>
        </div>
      </div>
    </div>
  );
}
