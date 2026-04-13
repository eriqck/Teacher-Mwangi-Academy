"use client";

import { useEffect, useMemo, useState } from "react";

type Metric = {
  value: string;
  label: string;
};

function extractNumericTarget(value: string) {
  const match = value.match(/([\d,.]+)/);

  if (!match) {
    return null;
  }

  return Number(match[1].replaceAll(",", ""));
}

function formatAnimatedValue(metric: Metric, currentValue: number) {
  const rounded = Math.round(currentValue);

  if (metric.value.startsWith("KSh")) {
    return `KSh ${rounded}`;
  }

  if (metric.value.includes("+")) {
    return `${rounded.toLocaleString()}+`;
  }

  return `${rounded}`;
}

export function HomeMetrics({ metrics }: { metrics: Metric[] }) {
  const targets = useMemo(
    () =>
      metrics.map((metric) => ({
        metric,
        numericTarget: extractNumericTarget(metric.value)
      })),
    [metrics]
  );
  const [values, setValues] = useState(() =>
    targets.map((item) => (item.numericTarget ? "0" : item.metric.value))
  );

  useEffect(() => {
    const animationFrameIds: number[] = [];
    const timeoutIds: number[] = [];

    targets.forEach((item, index) => {
      if (!item.numericTarget) {
        timeoutIds.push(
          window.setTimeout(() => {
            setValues((current) => {
              const next = [...current];
              next[index] = item.metric.value;
              return next;
            });
          }, 280 + index * 100)
        );
        return;
      }

      const durationMs = 1500 + index * 150;
      const startAt = performance.now();

      const tick = () => {
        const elapsed = performance.now() - startAt;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        setValues((current) => {
          const next = [...current];
          next[index] = formatAnimatedValue(item.metric, item.numericTarget! * eased);
          return next;
        });

        if (progress < 1) {
          animationFrameIds[index] = window.requestAnimationFrame(tick);
        }
      };

      animationFrameIds[index] = window.requestAnimationFrame(tick);
    });

    return () => {
      animationFrameIds.forEach((id) => window.cancelAnimationFrame(id));
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, [targets]);

  return (
    <div className="home-metric-grid">
      {targets.map((item, index) => (
        <div key={item.metric.label} className="home-metric-card home-metric-card--animated">
          <strong className="home-metric-value">{values[index]}</strong>
          <span className="home-metric-label">{item.metric.label}</span>
        </div>
      ))}
    </div>
  );
}
