"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

// ── Stagger Container ─────────────────────────────────────────────────────
const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export function StaggerContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

// ── Stagger Item ──────────────────────────────────────────────────────────
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// ── Fade In ───────────────────────────────────────────────────────────────
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}) {
  const directionOffset = {
    up: { y: 24 },
    down: { y: -24 },
    left: { x: 24 },
    right: { x: -24 },
    none: {},
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Scale In ──────────────────────────────────────────────────────────────
export function ScaleIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Glass Card (animated hover) ───────────────────────────────────────────
export function AnimatedCard({
  children,
  className = "",
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      className={`glass-card ${className}`}
      whileHover={
        hover
          ? {
              y: -2,
              boxShadow: "0 8px 30px rgba(var(--accent-dynamic-raw), 0.08)",
              transition: { duration: 0.2 },
            }
          : undefined
      }
      whileTap={hover ? { scale: 0.995 } : undefined}
    >
      {children}
    </motion.div>
  );
}

// ── Number Ticker (smooth counter) ────────────────────────────────────────
export function NumberTicker({
  value,
  className = "",
  format = true,
}: {
  value: number;
  className?: string;
  format?: boolean;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className={className}
    >
      {format ? value.toLocaleString() : value}
    </motion.span>
  );
}

// ── Slide In from side ────────────────────────────────────────────────────
export function SlideIn({
  children,
  className,
  from = "left",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  from?: "left" | "right";
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: from === "left" ? -40 : 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
