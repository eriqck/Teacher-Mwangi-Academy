import { requireUser } from "@/lib/auth";
import { readAppData } from "@/lib/repository";
import { getTeacherToolAccess } from "@/lib/teacher-tools";

function formatMoney(amount: number) {
  return `KSh ${amount}`;
}

export default async function TeacherToolTransactionsPage() {
  const user = await requireUser();
  const store = await readAppData();
  const access = getTeacherToolAccess(store, user);
  const payments = store.payments
    .filter(
      (payment) =>
        payment.userId === user.id &&
        (payment.kind === "tool-access" || payment.kind === "scheme" || payment.kind === "resource")
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    <section className="teacher-tools-content">
      <div className="teacher-tools-section-head">
        <div>
          <span className="eyebrow">Transactions</span>
          <h2>Teacher tools and one-time purchase history</h2>
        </div>
      </div>

      <article className="teacher-tools-card">
        <p className="subtle">
          Bot access is {access.hasAccess ? "active" : access.pendingAccess ? "still pending" : "not yet unlocked"}.
        </p>

        {payments.length > 0 ? (
          <table className="mini-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.createdAt.slice(0, 10)}</td>
                  <td>{payment.kind}</td>
                  <td>{formatMoney(payment.amount)}</td>
                  <td>{payment.status}</td>
                  <td>{payment.accountReference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="subtle">No teacher-side transactions have been saved yet.</p>
        )}
      </article>
    </section>
  );
}
