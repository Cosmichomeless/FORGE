import { PrivateShell } from "@/components/auth/private-shell";

export default function DashboardPage() {
  return <main className="mx-auto max-w-4xl px-6 py-12"><PrivateShell><h1 className="text-3xl font-semibold">Dashboard</h1><p className="mt-4">Welcome to FORGE.</p></PrivateShell></main>;
}
