"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration: number = 1000): number {
  const [value, setValue] = useState(0);
  const startTime = useRef<number>(0);
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    startTime.current = performance.now();
    const startVal = 0;

    function animate(now: number) {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startVal + (target - startVal) * eased));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    }

    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [target, duration]);

  return value;
}
