import { PrivateShell } from "@/components/auth/private-shell";
import { OrganizationsView } from "@/components/organizations/organizations-view";

export default function OrganizationsPage() {
  return <PrivateShell><OrganizationsView /></PrivateShell>;
}
