import { useContext } from "react";
import { ToastContext, type ToastContextValue } from "./toastContext";

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe no-op fallback so consumers don't need to guard for missing provider.
    return { toast: () => {} };
  }
  return ctx;
}
