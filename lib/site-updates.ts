export type SiteUpdate = {
  id: string;
  title: string;
  summary: string;
  badge: string;
  date: string;
  href?: string;
};

export const siteUpdates: SiteUpdate[] = [
  {
    id: "update-cekena-exams",
    title: "CEKENA Exams series added",
    summary:
      "Assessment sections now include CEKENA Exams alongside Set 1, Set 2, and Set 3 across all levels.",
    badge: "New assessments",
    date: "2026-04-13",
    href: "/levels/grade-7"
  },
  {
    id: "update-grade-6",
    title: "Grade 6 materials are now available",
    summary:
      "Junior School coverage now starts from Grade 6, with level cards and matching subject access already in place.",
    badge: "Coverage",
    date: "2026-04-08",
    href: "/levels/grade-6"
  },
  {
    id: "update-google-otp",
    title: "Easier account access for members",
    summary:
      "Google sign-in and OTP password reset are now available to help parents and teachers return to their accounts faster.",
    badge: "Accounts",
    date: "2026-03-29",
    href: "/login"
  }
];

export function getLatestSiteUpdates(limit = 3) {
  return [...siteUpdates]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, limit);
}
