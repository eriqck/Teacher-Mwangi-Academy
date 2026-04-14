import type { SubscriptionPlan } from "@/lib/store";

export const academyName = "Teacher Mwangi Academy";

export const subscriptionPlans: Record<
  SubscriptionPlan,
  {
    name: string;
    role: "parent" | "teacher";
    amount: number;
    cadence: string;
    audience: string;
    highlights: string[];
    levelAccessMode: "single" | "all";
  }
> = {
  "parent-monthly": {
    name: "Parent Subscription",
    role: "parent",
    amount: 300,
    cadence: "/month",
    audience: "For parents supporting learners across all available levels",
    highlights: [
      "Access to all learning levels with one subscription",
      "Weekly revision downloads and exam practice",
      "Parent guidance notes and home-study support",
      "M-Pesa monthly renewal flow"
    ],
    levelAccessMode: "all"
  },
  "teacher-monthly": {
    name: "Teacher Subscription",
    role: "teacher",
    amount: 150,
    cadence: "/month",
    audience: "For teachers, tutors, and subject support staff",
    highlights: [
      "Access across all revision levels",
      "Classroom-ready practice and assessment files",
      "Teacher support notes and download access",
      "Optional one-time schemes and single-material purchases"
    ],
    levelAccessMode: "all"
  }
};

export const schemeOfWorkPrice = 20;
export const teacherMaterialPrice = 30;
export const teacherToolAccessPrice = 30;
