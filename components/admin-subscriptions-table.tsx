"use client";

import { useState } from "react";

type AdminSubscriptionRow = {
  id: string;
  createdAt: string;
  fullName: string;
  email: string;
  planName: string;
  status: string;
  amountLabel: string;
  endDateLabel: string;
  canGrantAccess: boolean;
};

export function AdminSubscriptionsTable({
  initialSubscriptions
}: {
  initialSubscriptions: AdminSubscriptionRow[];
}) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [grantingId, setGrantingId] = useState<string | null>(null);

  async function handleGrantAccess(subscriptionId: string) {
    setGrantingId(subscriptionId);
    setMessage("");
    setError("");

    const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/grant`, {
      method: "POST"
    });

    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
      subscription?: {
        id: string;
        status: string;
        endDateLabel: string;
      };
    };

    setGrantingId(null);

    if (!response.ok || !data.subscription) {
      setError(data.error ?? "Could not grant access.");
      return;
    }

    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === data.subscription!.id
          ? {
              ...subscription,
              status: data.subscription!.status,
              endDateLabel: data.subscription!.endDateLabel,
              canGrantAccess: false
            }
          : subscription
      )
    );
    setMessage(data.message ?? "Access granted.");
  }

  return (
    <article className="dashboard-card">
      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      {subscriptions.length > 0 ? (
        <table className="mini-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Access ends</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <td>{subscription.createdAt.slice(0, 10)}</td>
                <td>{subscription.fullName}</td>
                <td>{subscription.email}</td>
                <td>{subscription.planName}</td>
                <td>{subscription.status}</td>
                <td>{subscription.amountLabel}</td>
                <td>{subscription.endDateLabel}</td>
                <td>
                  {subscription.canGrantAccess ? (
                    <button
                      type="button"
                      className="button-secondary button-reset"
                      onClick={() => handleGrantAccess(subscription.id)}
                      disabled={grantingId === subscription.id}
                    >
                      {grantingId === subscription.id ? "Granting..." : "Grant access"}
                    </button>
                  ) : (
                    <span className="pill">Up to date</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="subtle">No subscriber records have been saved yet.</p>
      )}
    </article>
  );
}
