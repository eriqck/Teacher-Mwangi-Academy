import { redirect } from "next/navigation";

export default async function LegacySchemeDetailPage({
  params
}: {
  params: Promise<{ schemeId: string }>;
}) {
  await params;
  redirect("/teacher-tools/lesson-plans");
}
