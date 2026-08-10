"use client";

import { useEffect, useMemo, useState } from "react";

const MEET_LINK = "https://meet.google.com/xei-dzzz-skv";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function MeetingSignup() {
  const defaultDate = useMemo(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    d.setHours(10, 0, 0, 0);
    return d;
  }, []);

  const [meetingDate, setMeetingDate] = useState<string>(
    defaultDate.toISOString().slice(0, 16)
  );
  const [now, setNow] = useState<number>(Date.now());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = useMemo(() => {
    const target = new Date(meetingDate).getTime();
    const delta = Math.max(0, target - now);
    const days = Math.floor(delta / (1000 * 60 * 60 * 24));
    const hours = Math.floor((delta / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((delta / (1000 * 60)) % 60);
    const seconds = Math.floor((delta / 1000) % 60);
    return { delta, days, hours, minutes, seconds };
  }, [meetingDate, now]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(MEET_LINK);
      // ignore
    } catch {
      // ignore
    }
  }

  return (
    <div className="meeting-signup">
      <div className="meeting-header">
        <h3>Grade 9 Meeting with Tr. Mwangi</h3>
        <p className="subtle">School Selection & New Updates</p>
      </div>

      <div className="meeting-grid">
        <div className="meeting-form">
          {submitted ? (
            <div className="message message-success">
              Thanks — the meet link will be sent to invited participants via email: <a href={MEET_LINK} target="_blank" rel="noreferrer">{MEET_LINK}</a>
              <div style={{ marginTop: 8 }}>
                <button className="button" onClick={copyLink} type="button">Copy meet link</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="panel-stack">
              <label className="field">
                <span>Choose date & time *</span>
                <input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>First name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>

              <label className="field">
                <span>Email *</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>

              <label className="field">
                <span>Mobile</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>

              <div className="hero-actions">
                <button className="button" type="submit">Book my spot</button>
              </div>
            </form>
          )}
        </div>

        <aside className="meeting-info">
          <div className="countdown">
            <strong>Starts in</strong>
            <div className="countdown-timer">
              <span>{remaining.days}d</span>
              <span>{pad(remaining.hours)}h</span>
              <span>{pad(remaining.minutes)}m</span>
              <span>{pad(remaining.seconds)}s</span>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <p className="subtle">Meeting link (invited participants will receive this via email):</p>
            <a href={MEET_LINK} target="_blank" rel="noreferrer" className="pill">{MEET_LINK}</a>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .meeting-grid { display: grid; grid-template-columns: 1fr 280px; gap: 20px; align-items: start; }
        .meeting-info { border-left: 1px solid #eee; padding-left: 16px; }
        .countdown { text-align: left; }
        .countdown-timer { display: flex; gap: 8px; margin-top: 8px; font-size: 1.1rem; }
        .pill { display: inline-block; padding: 6px 10px; background: #f3f4f6; border-radius: 8px; color: #0f172a; text-decoration: none; }
      `}</style>
    </div>
  );
}
