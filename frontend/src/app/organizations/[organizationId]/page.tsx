import { PrivateShell } from "@/components/auth/private-shell";
import { OrganizationDetail } from "@/components/organizations/organization-detail";

export default async function OrganizationPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  return <PrivateShell><OrganizationDetail organizationId={organizationId} /></PrivateShell>;
}
