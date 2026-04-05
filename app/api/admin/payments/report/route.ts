import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readAppData } from "@/lib/repository";

function escapeCsv(value: string | number | null | undefined) {
  const normalized = `${value ?? ""}`.replaceAll('"', '""');
  return `"${normalized}"`;
}

export async function GET() {
  try {
    await requireAdmin();

    const store = await readAppData();
    const usersById = new Map(store.users.map((user) => [user.id, user]));
    const payments = store.payments
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const paidPayments = payments.filter((payment) => payment.status === "paid");
    const pendingPayments = payments.filter((payment) => payment.status === "pending");
    const failedPayments = payments.filter((payment) => payment.status === "failed");

    const summaryRows = [
      ["Metric", "Value"],
      ["Generated at", new Date().toISOString()],
      ["Total payments saved", payments.length],
      ["Successful payments count", paidPayments.length],
      ["Successful payments total (KES)", paidPayments.reduce((sum, payment) => sum + payment.amount, 0)],
      ["Pending payments count", pendingPayments.length],
      ["Pending payments total (KES)", pendingPayments.reduce((sum, payment) => sum + payment.amount, 0)],
      ["Failed payments count", failedPayments.length],
      ["Failed payments total (KES)", failedPayments.reduce((sum, payment) => sum + payment.amount, 0)],
      ["Paid subscriptions total (KES)", paidPayments.filter((payment) => payment.kind === "subscription").reduce((sum, payment) => sum + payment.amount, 0)],
      ["Paid schemes total (KES)", paidPayments.filter((payment) => payment.kind === "scheme").reduce((sum, payment) => sum + payment.amount, 0)],
      ["Paid one-time materials total (KES)", paidPayments.filter((payment) => payment.kind === "resource").reduce((sum, payment) => sum + payment.amount, 0)]
    ];

    const detailHeader = [
      "Date",
      "Time",
      "User",
      "Email",
      "Phone",
      "Type",
      "Plan",
      "Amount",
      "Status",
      "Provider",
      "Reference",
      "Payment Reference",
      "Description"
    ];

    const detailRows = payments.map((payment) => {
      const user = usersById.get(payment.userId);
      const eventDate = payment.status === "paid" ? payment.updatedAt : payment.createdAt;

      return [
        new Intl.DateTimeFormat("en-KE", {
          dateStyle: "medium",
          timeZone: "Africa/Nairobi"
        }).format(new Date(eventDate)),
        new Intl.DateTimeFormat("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Africa/Nairobi"
        }).format(new Date(eventDate)),
        user?.fullName ?? payment.userId,
        user?.email ?? "",
        payment.phoneNumber || user?.phoneNumber || "",
        payment.kind,
        payment.plan ?? "",
        payment.amount,
        payment.status,
        payment.provider ?? "",
        payment.accountReference,
        payment.paymentReference ?? "",
        payment.resultDesc ?? ""
      ];
    });

    const csv = [
      ...summaryRows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")),
      "",
      detailHeader.map((cell) => escapeCsv(cell)).join(","),
      ...detailRows.map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="teacher-mwangi-payments-report-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not generate the payments report."
      },
      { status: 400 }
    );
  }
}
