import { redirect } from "next/navigation";

export default async function LegacySchemeDetailPage({
  params
}: {
  params: Promise<{ schemeId: string }>;
}) {
  const { schemeId } = await params;
  redirect(`/teacher-tools/schemes/${schemeId}`);
}
