"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import "./MasterclassRegistration.css";

const MASTERCLASS_DATE = new Date(
  "2026-08-12T20:00:00+03:00"
).getTime();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  grade: string;
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

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    grade: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");
  const paymentSuccess = paymentStatus === "success";
  const paymentFailed = paymentStatus === "failed";

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setRequestError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/masterclass-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          phone: formData.phone,
          childGrade: formData.grade,
          amount: 100
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Payment initialization failed.");
      }

      const payload = await response.json();
      if (payload.paymentUrl) {
        window.location.href = payload.paymentUrl;
        return;
      }

      throw new Error("Unable to start payment. Please try again.");
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
            <p className="eyebrow">JOIN US TOMORROW</p>

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
          </div>
        </section>

        <section className="registration-section">
          <div className="registration-form">
            <div className="form-header">
              <h2>Register now</h2>
              <div className="price">
                <span>KSh</span> 100
              </div>
              <p>Secure your place in this exclusive masterclass.</p>
            </div>

            {paymentSuccess ? (
              <div className="success-state">
                <div className="success-icon">✓</div>
                <h2>Payment received!</h2>
                <p>Thank you, <strong>{formData.name || "participant"}</strong>.</p>
                <p>
                  Your registration is confirmed. A Google Meet link has been sent to your email.
                </p>

                <div className="success-details">
                  <div>
                    <span>Masterclass</span>
                    <strong>One-on-One with KJSEA Examiners</strong>
                  </div>

                  <div>
                    <span>Date</span>
                    <strong>August 12, 2026</strong>
                  </div>

                  <div>
                    <span>Time</span>
                    <strong>8:00 PM EAT</strong>
                  </div>

                  <div>
                    <span>Registration fee</span>
                    <strong>KSh 100</strong>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="07XX XXX XXX"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="grade">Child's Grade</label>
                  <select
                    id="grade"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select grade</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                  </select>
                </div>

                {requestError ? (
                  <div className="form-error">{requestError}</div>
                ) : null}

                {paymentFailed ? (
                  <div className="form-error">
                    Payment was not completed. Please try again.
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="payment-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Redirecting to payment…" : "Continue to Payment"}
                  <span>→</span>
                </button>
              </form>
            )}

            <div className="secure-payment">
              <span>🔒</span>
              <div>
                <strong>Secure registration</strong>
                <small>Registration fee: KSh 100</small>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
