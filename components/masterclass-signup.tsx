"use client";

import { useEffect, useMemo, useState } from "react";

const MASTERCLASS_DATE = new Date("2026-08-24T14:00:00").getTime();
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

    // Validate required fields
    if (!fullName || !email || !phone || !childGrade) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      // Store registration data
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
      
      // Redirect to payment
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  return (
    <div className="masterclass-container">
      <div className="masterclass-layout">
        {/* Left Section */}
        <div className="masterclass-left">
          <div className="masterclass-header">
            <span className="eyebrow">Join our masterclass</span>
            <h1>One-on-One with KJSEA Examiners</h1>
          </div>

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

          <div className="countdown-section">
            <strong>Masterclass Starts In</strong>
            <div className="countdown-display">
              <div className="countdown-item">
                <span className="countdown-number">{pad(countdown.days)}</span>
                <span className="countdown-label">Days</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number">{pad(countdown.hours)}</span>
                <span className="countdown-label">Hours</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number">{pad(countdown.minutes)}</span>
                <span className="countdown-label">Minutes</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number">{pad(countdown.seconds)}</span>
                <span className="countdown-label">Seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="masterclass-right">
          <div className="registration-card">
            <h2>Register for the Masterclass</h2>
            <div className="price-tag">
              <strong>Only KSh {PRICE_KSH}</strong>
            </div>

            {submitted ? (
              <div className="message message-success">
                <p>Thank you for registering! Check your email for the masterclass details.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="masterclass-form">
                {error && <div className="message message-error">{error}</div>}

                <div className="form-group">
                  <label htmlFor="fullName">
                    <strong>Full Name</strong>
                    <span className="required">*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">
                    <strong>Email Address</strong>
                    <span className="required">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">
                    <strong>Phone Number</strong>
                    <span className="required">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="07XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="childGrade">
                    <strong>Child's Grade</strong>
                    <span className="required">*</span>
                  </label>
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

                <button type="submit" className="button button-primary button-large">
                  CONTINUE TO PAYMENT
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .masterclass-container {
          width: 100%;
        }

        .masterclass-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 40px;
          align-items: flex-start;
        }

        .masterclass-left {
          padding: 0;
        }

        .masterclass-header {
          margin-bottom: 24px;
        }

        .masterclass-header .eyebrow {
          display: inline-block;
          color: #0066cc;
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .masterclass-header h1 {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 0;
          color: #0f172a;
        }

        .masterclass-questions {
          margin: 32px 0;
        }

        .masterclass-questions h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 12px 0;
          color: #1e293b;
          line-height: 1.3;
        }

        .masterclass-content {
          margin: 24px 0;
          line-height: 1.6;
          color: #475569;
          font-size: 0.95rem;
        }

        .masterclass-content p {
          margin: 12px 0;
        }

        .masterclass-content p strong {
          color: #0f172a;
        }

        .countdown-section {
          margin-top: 40px;
          padding: 24px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .countdown-section strong {
          display: block;
          margin-bottom: 16px;
          color: #0f172a;
          font-size: 0.95rem;
        }

        .countdown-display {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .countdown-item {
          text-align: center;
          background: white;
          padding: 12px 8px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .countdown-number {
          display: block;
          font-size: 1.75rem;
          font-weight: 700;
          color: #0066cc;
          line-height: 1;
          margin-bottom: 4px;
        }

        .countdown-label {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
        }

        .masterclass-right {
          position: sticky;
          top: 20px;
        }

        .registration-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 28px 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .registration-card h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 16px 0;
          color: #0f172a;
          text-align: center;
        }

        .price-tag {
          text-align: center;
          margin-bottom: 24px;
          padding: 12px;
          background: #f0f9ff;
          border-radius: 8px;
        }

        .price-tag strong {
          color: #0066cc;
          font-size: 1.1rem;
          display: block;
        }

        .masterclass-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-weight: 600;
          color: #0f172a;
          font-size: 0.9rem;
        }

        .required {
          color: #dc2626;
          margin-left: 2px;
        }

        .form-group input,
        .form-group select {
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.95rem;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        .form-group input::placeholder {
          color: #94a3b8;
        }

        .button-primary {
          background: #0066cc;
          color: white;
          font-weight: 600;
          margin-top: 8px;
        }

        .button-primary:hover {
          background: #0052a3;
        }

        .button-large {
          padding: 12px 20px;
          font-size: 0.95rem;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 0.9rem;
        }

        .message-success {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #86efac;
        }

        .message-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        @media (max-width: 1024px) {
          .masterclass-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .masterclass-right {
            position: static;
          }

          .masterclass-header h1 {
            font-size: 1.75rem;
          }

          .countdown-display {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .masterclass-header h1 {
            font-size: 1.5rem;
          }

          .masterclass-questions h3 {
            font-size: 1rem;
          }

          .countdown-number {
            font-size: 1.5rem;
          }

          .registration-card {
            padding: 20px 16px;
          }

          .masterclass-layout {
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}
