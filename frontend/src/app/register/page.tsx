import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return <AuthCard title="Create account" description="Set up your FORGE account in a few seconds."><AuthForm mode="register" /></AuthCard>;
}
