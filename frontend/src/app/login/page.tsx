import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return <AuthCard title="Log in" description="Welcome back. Sign in to continue to your workspace."><AuthForm mode="login" /></AuthCard>;
}
