/**
 * Premium animated component primitives (Phase 1 redesign).
 * Built on Framer Motion + design tokens. Respects prefers-reduced-motion.
 * Import: `import { GlowCard, AnimatedCounter, ... } from "@/components/ui/motion"`
 */
import * as React from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform, useReducedMotion, type HTMLMotionProps, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/* ---------- Variants ---------- */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const stagger = (delay = 0.06): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
});

/* ---------- MotionFade (scroll reveal) ---------- */
export function MotionFade({
  children,
  className,
  delay = 0,
  y = 16,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- GlowCard ---------- */
export const GlowCard = React.forwardRef<HTMLDivElement, HTMLMotionProps<"div"> & { glow?: "primary" | "accent" | "none" }>(
  ({ className, glow = "primary", children, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5 transition-shadow duration-300",
        glow === "primary" && "hover:glow-primary",
        glow === "accent" && "hover:glow-accent",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
GlowCard.displayName = "GlowCard";

/* ---------- TiltCard (3D pointer tilt) ---------- */
export function TiltCard({ children, className, max = 8 }: { children: React.ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), { stiffness: 200, damping: 18 });
  const rY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), { stiffness: 200, damping: 18 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rX, rotateY: rY, transformPerspective: 1000 }}
      className={cn("gpu", className)}
    >
      {children}
    </motion.div>
  );
}

/* ---------- AnimatedButton (magnetic + ripple feel) ---------- */
export const AnimatedButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline"; glow?: boolean }
>(({ className, variant = "primary", glow = true, children, ...props }, ref) => {
  const base = "relative inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl text-sm font-semibold transition-all duration-300 gpu disabled:opacity-50 disabled:pointer-events-none";
  const styles = {
    primary: "bg-primary text-primary-foreground hover:brightness-110",
    ghost: "bg-transparent text-foreground hover:bg-muted",
    outline: "border border-border bg-background/50 backdrop-blur hover:bg-muted",
  }[variant];

  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={cn(base, styles, glow && variant === "primary" && "glow-primary-hover", className)}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
});
AnimatedButton.displayName = "AnimatedButton";

/* ---------- AnimatedCounter ---------- */
export function AnimatedCounter({
  to,
  from = 0,
  duration = 1.4,
  className,
  format = (n: number) => Math.round(n).toLocaleString(),
}: {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = React.useState(from);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (!inView) return;
    if (reduce) return setVal(to);
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, from, duration, reduce]);

  return <span ref={ref} className={className}>{format(val)}</span>;
}

/* ---------- GradientBackground (animated ambient blobs) ---------- */
export function GradientBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden -z-10", className)}>
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-accent/25 blur-3xl animate-float" style={{ animationDelay: "-2s" }} />
      <div className="absolute -bottom-40 left-1/4 h-[460px] w-[460px] rounded-full bg-secondary/25 blur-3xl animate-float" style={{ animationDelay: "-4s" }} />
    </div>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-md", className)} />;
}

/* ---------- LoadingScreen ---------- */
export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/80 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
        />
        <p className="text-sm text-muted-foreground tracking-wide">{label}…</p>
      </div>
    </div>
  );
}
