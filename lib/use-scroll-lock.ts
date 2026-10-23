"use client";

import { useEffect } from "react";

/** Lock page scroll and close on Escape while an overlay is open. */
export function useOverlay(open: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", h);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", h);
    };
  }, [open, onClose]);
}
