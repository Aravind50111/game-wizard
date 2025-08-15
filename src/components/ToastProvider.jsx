// src/components/ToastProvider.jsx
import React, { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastCtx = createContext(null);

export function useToast() {
  return useContext(ToastCtx);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // NEW: simple dedupe window
  const lastRef = useRef({ msg: "", ts: 0 });

  const remove = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (msg, kind = "info", ttlMs = 2000) => {
      const now = Date.now();
      if (lastRef.current.msg === msg && now - lastRef.current.ts < 1200) {
        // ignore duplicates arriving in quick succession
        return;
      }
      lastRef.current = { msg, ts: now };

      const id =
        (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID()
          : String(now + Math.random());

      setToasts((ts) => [...ts, { id, msg, kind }]);
      setTimeout(() => remove(id), ttlMs);
    },
    [remove]
  );

  return (
    <ToastCtx.Provider value={{ push, remove }}>
      <div className="gw-toast-wrap">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`gw-toast gw-toast-${t.kind}`}
            role="status"
            onClick={() => remove(t.id)}
            title="Click to dismiss"
          >
            {t.msg}
          </div>
        ))}
      </div>
      {children}
    </ToastCtx.Provider>
  );
}