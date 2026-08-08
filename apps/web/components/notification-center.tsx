"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, BellOff, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import { trpc } from "@/lib/trpc/client";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = trpc.notification.list.useQuery(
    { limit: 10 },
    { refetchInterval: 60_000 },
  );
  const utils = trpc.useUtils();

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => utils.notification.list.invalidate(),
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => utils.notification.list.invalidate(),
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.data ?? [];

  function handleItemClick(id: string, read: boolean) {
    if (!read) markRead.mutate({ id });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={clsx(
          "relative rounded-lg p-2 transition-colors",
          open
            ? "bg-primary-50 text-primary-600"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                <BellOff className="h-4 w-4 animate-pulse" /> Loading…
              </div>
            )}
            {!isLoading && isError && (
              <div className="py-10 text-center text-sm text-slate-400">
                Failed to load notifications.
              </div>
            )}
            {!isLoading && !isError && notifications.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <Inbox className="h-6 w-6 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">
                  All caught up
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  New notifications will appear here.
                </p>
              </div>
            )}
            {!isLoading &&
              !isError &&
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n.id, n.read)}
                  className={clsx(
                    "flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50",
                    !n.read && "bg-primary-50/40",
                  )}
                >
                  <span
                    className={clsx(
                      "mt-1.5 flex h-2 w-2 shrink-0 rounded-full",
                      n.read ? "bg-slate-200" : "bg-primary-500",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={clsx(
                        "block truncate text-sm",
                        n.read
                          ? "text-slate-500"
                          : "font-medium text-slate-900",
                      )}
                    >
                      {n.title}
                    </span>
                    {n.message && (
                      <span className="mt-0.5 block truncate text-xs text-slate-400">
                        {n.message}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
