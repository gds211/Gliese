// src/hooks/usePageVisible.ts
import { useEffect, useState } from "react";

/**
 * Returns true when the document is visible.
 * We use this to pause expensive RPCs when the tab is hidden.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState === "visible";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return visible;
}

export default usePageVisible;
