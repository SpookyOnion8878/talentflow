"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type ToastFn = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastFn>(() => {});

/** Imperative toast hook: `const toast = useToast(); toast("Saved.")` */
export function useToast(): ToastFn {
  return useContext(ToastContext);
}

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-surface text-text-hi",
  error: "border-red-200 bg-surface text-text-hi",
  info: "border-border bg-surface text-text-hi",
};

const ICON_STYLES: Record<ToastKind, string> = {
  success: "text-emerald-600",
  error: "text-red-500",
  info: "text-text-mid",
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback<ToastFn>(
    (message, kind = "info") => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-3), { id, kind, message }]);
      const timer = setTimeout(() => dismiss(id), 4500);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => dismiss(item.id)}
              className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left shadow-lg transition-opacity hover:opacity-90 ${STYLES[item.kind]}`}
            >
              <Icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_STYLES[item.kind]}`}
                aria-hidden
              />
              <span className="text-sm">{item.message}</span>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
