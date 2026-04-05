"use client";

import { useMemo, useState } from "react";

type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: "parent" | "teacher" | "admin";
  selectedPlan: "parent-monthly" | "teacher-monthly" | null;
  planLabel: string;
  subscriptionStatus: string;
  accessEnds: string;
  canManageMembership: boolean;
};

export function AdminUserManager({
  initialUsers
}: {
  initialUsers: AdminUserRow[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return users;
    }

    return users.filter((user) =>
      [user.fullName, user.email, user.phoneNumber, user.role]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [query, users]);

  async function applyMembership(userId: string, plan: AdminUserRow["selectedPlan"], mode: "grant" | "change") {
    if (!plan) {
      setError("Choose a membership plan first.");
      return;
    }

    const key = `${mode}:${userId}`;
    setLoadingKey(key);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/membership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan })
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        user?: { id: string; role: AdminUserRow["role"] } | null;
        subscription?: {
          id: string;
          plan: NonNullable<AdminUserRow["selectedPlan"]>;
          status: string;
          amount: number;
          endDateLabel: string;
        };
      };

      if (!response.ok || !data.subscription) {
        setError(data.error ?? "Could not update this account.");
        return;
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: data.user?.role ?? user.role,
                selectedPlan: data.subscription?.plan ?? user.selectedPlan,
                planLabel:
                  data.subscription?.plan === "teacher-monthly"
                    ? "Teacher Subscription"
                    : "Parent Subscription",
                subscriptionStatus: data.subscription?.status ?? user.subscriptionStatus,
                accessEnds: data.subscription?.endDateLabel ?? user.accessEnds
              }
            : user
        )
      );
      setMessage(
        mode === "grant"
          ? "Access granted successfully."
          : (data.message ?? "Membership updated successfully.")
      );
    } catch {
      setError("Could not update this account right now.");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <article className="dashboard-card admin-panel-card">
      <div className="panel-stack">
        <div className="field admin-search-field">
          <label htmlFor="admin-user-search">Search users</label>
          <input
            id="admin-user-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, phone, or role"
          />
        </div>

        {error ? <div className="message message-error">{error}</div> : null}
        {message ? <div className="message message-success">{message}</div> : null}

        {filteredUsers.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="mini-table admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Membership</th>
                  <th>Status</th>
                  <th>Access ends</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-cell">
                        <strong>{user.fullName}</strong>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phoneNumber}</td>
                    <td>
                      <span className={`pill admin-role-pill admin-role-pill--${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.canManageMembership ? (
                        <select
                          className="admin-plan-select"
                          value={user.selectedPlan ?? ""}
                          onChange={(event) => {
                            const value = event.target.value as AdminUserRow["selectedPlan"];
                            setUsers((current) =>
                              current.map((entry) =>
                                entry.id === user.id
                                  ? {
                                      ...entry,
                                      selectedPlan: value
                                    }
                                  : entry
                              )
                            );
                          }}
                        >
                          <option value="parent-monthly">Parent Subscription</option>
                          <option value="teacher-monthly">Teacher Subscription</option>
                        </select>
                      ) : (
                        <span className="pill">Admin account</span>
                      )}
                    </td>
                    <td>
                      <span className={`pill admin-status-pill admin-status-pill--${user.subscriptionStatus}`}>
                        {user.subscriptionStatus}
                      </span>
                    </td>
                    <td>{user.accessEnds}</td>
                    <td>
                      {user.canManageMembership ? (
                        <div className="resource-edit-actions">
                          <button
                            type="button"
                            className="button-secondary button-reset"
                            onClick={() => applyMembership(user.id, user.selectedPlan, "grant")}
                            disabled={loadingKey === `grant:${user.id}`}
                          >
                            {loadingKey === `grant:${user.id}` ? "Granting..." : "Grant access"}
                          </button>
                          <button
                            type="button"
                            className="button button-reset"
                            onClick={() => applyMembership(user.id, user.selectedPlan, "change")}
                            disabled={loadingKey === `change:${user.id}`}
                          >
                            {loadingKey === `change:${user.id}` ? "Saving..." : "Save plan"}
                          </button>
                        </div>
                      ) : (
                        <span className="pill">No change</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="subtle">No users matched your search.</p>
        )}
      </div>
    </article>
  );
}
