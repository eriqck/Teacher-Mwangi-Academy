"use client";

import { useEffect, useState } from "react";
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

  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    console.log("Masterclass registration:", formData);

    /*
      Later we will replace this with:

      1. Send registration to Go backend
      2. Save parent details in PostgreSQL
      3. Initiate KSh 100 M-Pesa payment
      4. Confirm payment
      5. Send masterclass details by email
    */

    setSubmitted(true);
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
          {!submitted ? (
            <div className="registration-form">
              <div className="form-header">
                <h2>Register now</h2>
                <div className="price">
                  <span>KSh</span> 100
                </div>
                <p>Secure your place in this exclusive masterclass.</p>
              </div>

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

                <button type="submit" className="payment-button">
                  Continue to Payment
                  <span>→</span>
                </button>
              </form>

              <div className="secure-payment">
                <span>🔒</span>
                <div>
                  <strong>Secure registration</strong>
                  <small>Registration fee: KSh 100</small>
                </div>
              </div>
            </div>
          ) : (
            <div className="success-state">
              <div className="success-icon">✓</div>
              <h2>Registration received!</h2>
              <p>Thank you, <strong>{formData.name}</strong>.</p>
              <p>Complete your payment of KSh 100 to confirm your registration.</p>

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

              <button
                className="payment-button"
                onClick={() => {
                  alert("M-Pesa payment integration will be connected here.");
                }}
              >
                Pay KSh 100
                <span>→</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
