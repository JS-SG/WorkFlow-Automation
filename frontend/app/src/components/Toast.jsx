import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const ICONS = { success: "✓", error: "✕", info: "i", warning: "⚠" };

  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span style={{
              width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
              background: t.type === "success" ? "var(--green-bg)" : t.type === "error" ? "var(--red-bg)" : t.type === "warning" ? "var(--yellow-bg)" : "var(--blue-bg)",
              color: t.type === "success" ? "var(--green)" : t.type === "error" ? "var(--red)" : t.type === "warning" ? "var(--yellow)" : "var(--blue)",
            }}>
              {ICONS[t.type]}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
