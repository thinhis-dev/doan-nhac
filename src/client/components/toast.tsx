import { CircleAlert, CircleCheck } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastKind = "info" | "error";
type ToastItem = { id: number; text: string; kind: ToastKind };
type ShowToast = (text: string, kind?: ToastKind) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const TOAST_MS = 4000;

/** Toasts at the top of the screen, below the safe area. Each closes after 4 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback<ShowToast>((text, kind = "info") => {
    const id = nextId.current++;
    setItems((list) => [...list.slice(-2), { id, text, kind }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-toast flex flex-col items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))]"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item }: { item: ToastItem }) {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);
  const Icon = item.kind === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={item.kind === "error" ? "alert" : "status"}
      className={`flex w-full max-w-[520px] items-center gap-3 rounded-chip border-2 bg-surface px-4 py-3 text-body shadow-card transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"} ${item.kind === "error" ? "border-danger" : "border-outline"}`}
    >
      <Icon size={24} strokeWidth={2.25} aria-hidden className={item.kind === "error" ? "text-danger" : "text-success"} />
      <span>{item.text}</span>
    </div>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
