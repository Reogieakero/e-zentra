import { useEffect, useState } from "react";

export function useRiskCarousel(count: number, intervalMs = 2000) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearTimeout(timer);
  }, [count, index, intervalMs]);

  return { index, setIndex };
}
