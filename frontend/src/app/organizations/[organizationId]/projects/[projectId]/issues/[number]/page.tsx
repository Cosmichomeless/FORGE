import { PrivateShell } from "@/components/auth/private-shell";
import { IssueDetail } from "@/components/issues/issue-detail";

export default async function IssuePage({ params }: { params: Promise<{ organizationId: string; projectId: string; number: string }> }) {
  const { organizationId, projectId, number } = await params;
  return <PrivateShell><IssueDetail organizationId={organizationId} projectId={projectId} number={number} /></PrivateShell>;
}
