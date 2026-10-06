import { PrivateShell } from "@/components/auth/private-shell";
import { ProjectOverview } from "@/components/projects/project-overview";

export default async function ProjectPage({ params }: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const { organizationId, projectId } = await params;
  return <PrivateShell><ProjectOverview organizationId={organizationId} projectId={projectId} /></PrivateShell>;
}
