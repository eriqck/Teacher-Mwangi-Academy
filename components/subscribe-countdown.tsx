"use client";

import { useEffect, useState } from "react";

type CountdownResult = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type SubscribeCountdownProps = {
  targetDate: string;
};

function formatNumber(value: number) {
  return String(value).padStart(2, "0");
}

function getCountdown(targetDate: string): CountdownResult | null {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return null;
  }

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / 1000 / 60) % 60;
  const hours = Math.floor(diff / 1000 / 60 / 60) % 24;
  const days = Math.floor(diff / 1000 / 60 / 60 / 24);

  return { days, hours, minutes, seconds };
}

export function SubscribeCountdown({ targetDate }: SubscribeCountdownProps) {
  const [countdown, setCountdown] = useState<CountdownResult | null>(() => getCountdown(targetDate));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdown(targetDate));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [targetDate]);

  if (!countdown) {
    return (
      <div className="subscribe-countdown-card">
        <p className="subscribe-countdown-status">The live session has started or the date has passed.</p>
      </div>
    );
  }

  return (
    <div className="subscribe-countdown-card">
      {[
        ["Days", countdown.days],
        ["Hours", countdown.hours],
        ["Minutes", countdown.minutes],
        ["Seconds", countdown.seconds]
      ].map(([label, value]) => (
        <div key={label} className="subscribe-countdown-item">
          <span className="subscribe-countdown-value">{formatNumber(Number(value))}</span>
          <span className="subscribe-countdown-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
