"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { X } from "lucide-react";

import { cx } from "@/components/ui/cx";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastOptions = {
  /** Toasts sharing an id are deduplicated: the existing one refreshes instead of stacking a new one. */
  id?: string;
  description?: string;
  duration?: number;
};

type ToastItem = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration: number;
  renderKey: number;
};

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
};

const MAX_VISIBLE = 3;

type ToastContextValue = {
  success: (title: string, options?: ToastOptions) => void;
  error: (title: string, options?: ToastOptions) => void;
  warning: (title: string, options?: ToastOptions) => void;
  info: (title: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let autoId = 0;
function generateId(prefix: string) {
  autoId += 1;
  return `${prefix}-${autoId}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<ToastItem[]>([]);
  const queueRef = useRef<ToastItem[]>([]);

  const promote = useCallback(() => {
    setVisible((current) => {
      if (current.length >= MAX_VISIBLE) {
        return current;
      }
      const next = queueRef.current.shift();
      if (!next) {
        return current;
      }
      return [...current, next];
    });
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      queueRef.current = queueRef.current.filter((item) => item.id !== id);
      setVisible((current) => current.filter((item) => item.id !== id));
      promote();
    },
    [promote],
  );

  const push = useCallback((variant: ToastVariant, title: string, options?: ToastOptions) => {
    const id = options?.id ?? generateId(variant);

    setVisible((current) => {
      const index = current.findIndex((existing) => existing.id === id);
      const renderKey = index !== -1 ? current[index].renderKey + 1 : 0;
      const item: ToastItem = {
        id,
        variant,
        title,
        description: options?.description,
        duration: options?.duration ?? DEFAULT_DURATION[variant],
        renderKey,
      };

      if (index !== -1) {
        const next = [...current];
        next[index] = item;
        return next;
      }

      if (current.length < MAX_VISIBLE) {
        return [...current, item];
      }

      const queueIndex = queueRef.current.findIndex((queued) => queued.id === id);
      if (queueIndex !== -1) {
        queueRef.current[queueIndex] = item;
      } else {
        queueRef.current = [...queueRef.current, item];
      }
      return current;
    });
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (title, options) => push("success", title, options),
      error: (title, options) => push("error", title, options),
      warning: (title, options) => push("warning", title, options),
      info: (title, options) => push("info", title, options),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider duration={DEFAULT_DURATION.success} swipeDirection="right">
        {children}
        {visible.map((item) => (
          <RadixToast.Root
            key={`${item.id}:${item.renderKey}`}
            className={cx("ui-toast", `ui-toast-${item.variant}`)}
            type={item.variant === "error" ? "foreground" : "background"}
            duration={item.duration}
            onOpenChange={(open) => {
              if (!open) {
                dismiss(item.id);
              }
            }}
          >
            <RadixToast.Title className="ui-toast-title">{item.title}</RadixToast.Title>
            {item.description ? (
              <RadixToast.Description className="ui-toast-description">
                {item.description}
              </RadixToast.Description>
            ) : null}
            <RadixToast.Close className="ui-toast-close" aria-label="Cerrar">
              <X width={16} height={16} aria-hidden="true" />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="ui-toast-viewport" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
