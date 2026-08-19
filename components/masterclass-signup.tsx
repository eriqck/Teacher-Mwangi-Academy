"use client";

import { useEffect, useMemo, useState } from "react";

const MASTERCLASS_DATE = new Date("2026-08-20T19:00:00+03:00").getTime();
const PRICE_KSH = 100;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function MasterclassSignup() {
  const [now, setNow] = useState<number>(Date.now());
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [childGrade, setChildGrade] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const countdown = useMemo(() => {
    const delta = Math.max(0, MASTERCLASS_DATE - now);
    const days = Math.floor(delta / (1000 * 60 * 60 * 24));
    const hours = Math.floor((delta / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((delta / (1000 * 60)) % 60);
    const seconds = Math.floor((delta / 1000) % 60);
    return { delta, days, hours, minutes, seconds };
  }, [now]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!fullName || !email || !phone || !childGrade) {
      setError("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/masterclass-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          childGrade,
          amount: PRICE_KSH,
        }),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const data = await response.json();
      
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="masterclass-layout">
      {/* Left Section */}
      <div className="masterclass-left">
        <span className="eyebrow">Join our Masterclass</span>
        <h1>One-on-One with KJSEA Examiners</h1>

        <div className="masterclass-questions">
          <h3>How do you present your work for examination?</h3>
          <h3>How are marks actually scored?</h3>
        </div>

        <div className="masterclass-content">
          <p>
            Did you know you can have the correct answer and still fail to score—simply because of how you present it?
          </p>
          <p>
            <strong>Join us on Tr Mwangi Academy as we engage KJSEA Examiners one-on-one and learn what truly matters in exams.</strong>
          </p>
        </div>

        <div className="masterclass-countdown panel">
          <p className="masterclass-countdown-label">Masterclass Starts In</p>
          <div className="countdown-timer">
            <div className="countdown-box">
              <span className="countdown-value">{pad(countdown.days)}</span>
              <span className="countdown-unit">Days</span>
            </div>
            <div className="countdown-box">
              <span className="countdown-value">{pad(countdown.hours)}</span>
              <span className="countdown-unit">Hours</span>
            </div>
            <div className="countdown-box">
              <span className="countdown-value">{pad(countdown.minutes)}</span>
              <span className="countdown-unit">Minutes</span>
            </div>
            <div className="countdown-box">
              <span className="countdown-value">{pad(countdown.seconds)}</span>
              <span className="countdown-unit">Seconds</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <aside className="masterclass-right">
        <div className="panel masterclass-panel">
          <h2>Register for the Masterclass</h2>
          <div className="masterclass-price">Only KSh {PRICE_KSH}</div>

          {submitted ? (
            <div className="message message-success">
              Thank you for registering! The Google Meet link has been sent to your email.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="panel-stack">
              {error && <div className="message message-error">{error}</div>}

              <div className="field">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="childGrade">Child's Grade</label>
                <select
                  id="childGrade"
                  value={childGrade}
                  onChange={(e) => setChildGrade(e.target.value)}
                  required
                >
                  <option value="">Select grade</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>

              <button
                type="submit"
                className="button button-buy"
                style={{ width: "100%", marginTop: "8px" }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "CONTINUE TO PAYMENT"}
              </button>
            </form>
          )}
        </div>
      </aside>

      <style jsx>{`
        .masterclass-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 32px;
          align-items: start;
        }

        .masterclass-left {
          display: grid;
          gap: 20px;
        }

        .masterclass-left h1 {
          margin: 0;
          font-size: clamp(2rem, 5vw, 3.2rem);
          line-height: 1.1;
        }

        .masterclass-questions {
          display: grid;
          gap: 12px;
        }

        .masterclass-questions h3 {
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.3;
        }

        .masterclass-content {
          display: grid;
          gap: 12px;
          color: var(--muted);
          line-height: 1.65;
          font-size: 1rem;
        }

        .masterclass-content p {
          margin: 0;
        }

        .masterclass-countdown {
          padding: 28px;
          background: linear-gradient(135deg, rgba(31, 111, 95, 0.12), rgba(214, 164, 25, 0.08));
          border: 1px solid rgba(31, 111, 95, 0.15);
        }

        .masterclass-countdown-label {
          margin: 0 0 16px;
          font-weight: 700;
          font-size: 1rem;
        }

        .countdown-timer {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .countdown-box {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          padding: 14px 8px;
          text-align: center;
          display: grid;
          gap: 4px;
        }

        .countdown-value {
          display: block;
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--secondary);
          line-height: 1;
        }

        .countdown-unit {
          display: block;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--muted);
        }

        .masterclass-right {
          position: sticky;
          top: 20px;
        }

        .masterclass-panel {
          padding: 24px;
        }

        .masterclass-panel h2 {
          margin: 0 0 12px;
          font-size: 1.3rem;
          text-align: center;
        }

        .masterclass-price {
          text-align: center;
          background: rgba(31, 111, 95, 0.12);
          padding: 12px;
          border-radius: var(--radius-md);
          font-weight: 700;
          color: var(--secondary);
          font-size: 1.05rem;
          margin-bottom: 20px;
        }

        @media (max-width: 1024px) {
          .masterclass-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .masterclass-right {
            position: static;
          }

          .masterclass-left h1 {
            font-size: 2.2rem;
          }

          .countdown-timer {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .masterclass-left h1 {
            font-size: 1.6rem;
          }

          .masterclass-questions h3 {
            font-size: 1rem;
          }

          .countdown-value {
            font-size: 1.3rem;
          }

          .countdown-timer {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .countdown-box {
            padding: 10px 6px;
          }
        }
      `}</style>
    </div>
  );
}
