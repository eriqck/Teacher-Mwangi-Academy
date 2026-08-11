"use client";

import { useEffect, useState } from "react";
import "./MasterclassRegistration.css";

const MASTERCLASS_DATE = new Date(
  "2026-08-13T19:00:00+03:00"
).getTime();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeLeft = (): TimeLeft => {
  const difference = MASTERCLASS_DATE - Date.now();

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  return {
    days: Math.floor(
      difference / (1000 * 60 * 60 * 24)
    ),

    hours: Math.floor(
      (difference / (1000 * 60 * 60)) % 24
    ),

    minutes: Math.floor(
      (difference / (1000 * 60)) % 60
    ),

    seconds: Math.floor((difference / 1000) % 60),
  };
};

const formatNumber = (number: number): string => {
  return number.toString().padStart(2, "0");
};

interface TimeBoxProps {
  value: number;
  label: string;
}

function TimeBox({ value, label }: TimeBoxProps) {
  return (
    <div className="time-item">
      <div className="time-number">{formatNumber(value)}</div>
      <span>{label}</span>
    </div>
  );
}

export default function MasterclassRegistration() {
  const [timeLeft, setTimeLeft] =
    useState<TimeLeft>(calculateTimeLeft());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async () => {
    setRequestError(null);
    setIsSubmitting(true);

    try {
      window.location.href = "https://paystack.shop/pay/4tl2d8rd4-";
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="masterclass-page">
      <div className="masterclass-card">
        <section className="masterclass-content">
          <div className="academy-logo">
            <div className="logo-mark">T</div>
            <span>TR MWANGI ACADEMY</span>
          </div>

          <div className="content-wrapper">
            <p className="eyebrow">JOIN US ON THURS</p>

            <h1>
              One-on-One with
              <br />
              <span>KJSEA Examiners</span>
            </h1>

            <div className="questions">
              <p>How do you present your work for examination?</p>
              <p>How are marks actually scored?</p>
            </div>

            <p className="description">
              Did you know you can have the{" "}
              <strong>correct answer and still fail to score</strong>
              —simply because of how you present it?
            </p>

            <p className="description">
              Join us on{" "}
              <strong>Tr Mwangi Academy</strong>
              {" "}as we engage KJSEA Examiners one-on-one and learn what truly
              matters in exams.
            </p>

            <div className="event-info">
              <div className="event-item">
                <span className="event-icon">📅</span>
                <div>
                  <small>DATE</small>
                  <strong>Tomorrow, August 12</strong>
                </div>
              </div>

              <div className="event-item">
                <span className="event-icon">🕗</span>
                <div>
                  <small>TIME</small>
                  <strong>8:00 PM EAT</strong>
                </div>
              </div>
            </div>

            <div className="countdown-container">
              <p className="countdown-title">MASTERCLASS STARTS IN</p>

              <div className="countdown">
                <TimeBox value={timeLeft.days} label="Days" />
                <TimeBox value={timeLeft.hours} label="Hours" />
                <TimeBox value={timeLeft.minutes} label="Minutes" />
                <TimeBox value={timeLeft.seconds} label="Seconds" />
              </div>
            </div>

            <div className="payment-only-panel">
              <p>
                Click below to complete your masterclass registration with Paystack.
              </p>

              {requestError ? (
                <div className="form-error">{requestError}</div>
              ) : null}

              <button
                type="button"
                className="payment-button"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Redirecting to payment…" : "Continue to Payment"}
                <span>→</span>
              </button>

              <div className="secure-payment">
                <span>🔒</span>
                <div>
                  <strong>Secure registration</strong>
                  <small>Registration fee: KSh 100</small>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
