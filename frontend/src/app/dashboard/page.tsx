import { PrivateShell } from "@/components/auth/private-shell";
import { PersonalDashboard } from "@/components/dashboard/personal-dashboard";
import { ActiveOrganizationSummary } from "@/components/organizations/active-organization-summary";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function DashboardPage() {
  return <PrivateShell>
    <PageContainer className="space-y-8">
      <PageHeader title="Dashboard" description="Welcome to FORGE." />
      <ActiveOrganizationSummary />
      <PersonalDashboard />
    </PageContainer>
  </PrivateShell>;
}
