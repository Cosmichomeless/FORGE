import { PrivateShell } from "@/components/auth/private-shell";
import { OrganizationsView } from "@/components/organizations/organizations-view";

export default function OrganizationsPage() {
  return <main className="mx-auto max-w-4xl px-6 py-12"><PrivateShell><OrganizationsView /></PrivateShell></main>;
}
