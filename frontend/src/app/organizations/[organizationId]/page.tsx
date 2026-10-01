import { PrivateShell } from "@/components/auth/private-shell";
import { OrganizationDetail } from "@/components/organizations/organization-detail";

export default async function OrganizationPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  return <main className="mx-auto max-w-4xl px-6 py-12"><PrivateShell><OrganizationDetail organizationId={organizationId} /></PrivateShell></main>;
}
