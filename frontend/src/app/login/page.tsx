import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return <main className="mx-auto max-w-sm space-y-6 px-6 py-12"><h1 className="text-3xl font-semibold">Log in</h1><AuthForm mode="login" /></main>;
}
