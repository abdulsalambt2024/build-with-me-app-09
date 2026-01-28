import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type PullToRefreshProps = {
  onRefresh: () => void | Promise<void>;
  disabled?: boolean;
  thresholdPx?: number;
};

/**
 * Lightweight window-based pull-to-refresh for mobile.
 * Triggers only when the page is scrolled to top.
 */
export function PullToRefresh({ onRefresh, disabled, thresholdPx = 72 }: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const [pullPx, setPullPx] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const canUse = useMemo(() => {
    if (!isMobile) return false;
    if (disabled) return false;
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(pointer: coarse)").matches;
    }
    return true;
  }, [disabled, isMobile]);

  useEffect(() => {
    if (!canUse) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      if (window.scrollY > 0) return;
      startYRef.current = e.touches[0]?.clientY ?? null;
      activeRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!activeRef.current) return;
      if (isRefreshing) return;
      if (window.scrollY > 0) {
        activeRef.current = false;
        startYRef.current = null;
        setPullPx(0);
        return;
      }

      const startY = startYRef.current;
      if (startY == null) return;

      const currentY = e.touches[0]?.clientY ?? startY;
      const delta = Math.max(0, currentY - startY);
      if (delta > 0) e.preventDefault();

      const resisted = Math.min(delta * 0.6, thresholdPx * 1.4);
      setPullPx(resisted);
    };

    const onTouchEnd = async () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      startYRef.current = null;

      if (isRefreshing) return;

      const shouldRefresh = pullPx >= thresholdPx;
      if (!shouldRefresh) {
        setPullPx(0);
        return;
      }

      setIsRefreshing(true);
      setPullPx(thresholdPx);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullPx(0);
        }, 300);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [canUse, isRefreshing, onRefresh, pullPx, thresholdPx]);

  if (!canUse) return null;

  const visible = pullPx > 0 || isRefreshing;
  const progress = Math.min(1, pullPx / thresholdPx);
  const translateY = -48 + Math.round(progress * 56);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center transition-opacity"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="mt-2 flex items-center gap-2 rounded-full border bg-card/90 px-3 py-2 shadow-sm backdrop-blur"
        style={{ transform: `translateY(${translateY}px)` }}
      >
        <RefreshCw
          className={
            "h-4 w-4 text-muted-foreground " + (isRefreshing ? "animate-spin" : "")
          }
        />
        <span className="text-xs font-medium text-muted-foreground">
          {isRefreshing
            ? "Refreshing…"
            : progress >= 1
              ? "Release to refresh"
              : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
}
