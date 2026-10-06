"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authApi, AuthApiError } from "@/lib/auth-api";
import { useAuth } from "./auth-provider";

const registration = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  email: z.string().trim().toLowerCase().max(254, "Email must be at most 254 characters").pipe(z.email("Enter a valid email")),
  password: z.string().min(8, "Password must be at least 8 characters").refine(value => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 UTF-8 bytes"),
});
const login = z.object({
  name: z.string(), email: z.string().trim().toLowerCase().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});
type Values = z.infer<typeof registration>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const auth = useAuth();
  const submitting = useRef(false);
  const isRegister = mode === "register";
  const { register, handleSubmit, setError, clearErrors, resetField, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(isRegister ? registration : login),
    defaultValues: { name: "", email: "", password: "" },
  });
  async function submit(values: Values) {
    if (submitting.current) return;
    submitting.current = true;
    clearErrors();
    try {
      if (isRegister) {
        await authApi.register(values);
        resetField("password");
        router.replace("/login");
      } else {
        const user = await authApi.login({ email: values.email, password: values.password });
        await auth.setUser(user);
        resetField("password");
        router.replace("/dashboard");
      }
    } catch (error) {
      setError("root", { message: error instanceof AuthApiError ? error.message : "Unable to connect. Please try again." });
      if (error instanceof AuthApiError) {
        for (const field of ["name", "email", "password"] as const) {
          if (error.fieldErrors[field]) setError(field, { message: error.fieldErrors[field] });
        }
      }
    } finally { submitting.current = false; }
  }
  const fields = isRegister ? ["name", "email", "password"] as const : ["email", "password"] as const;
  const labels = { name: "Name", email: "Email", password: "Password" } as const;
  return (
    <form noValidate onSubmit={(event) => { void handleSubmit(submit)(event); }} className="space-y-5" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        {fields.map(field => (
          <TextField key={field} id={field} label={labels[field]} error={errors[field]?.message}
            type={field === "password" ? "password" : field === "email" ? "email" : "text"}
            autoComplete={field === "password" ? (isRegister ? "new-password" : "current-password") : field === "email" ? "username" : "name"}
            hint={isRegister && field === "password" ? "At least 8 characters." : undefined}
            {...register(field)} />
        ))}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Please wait…" : isRegister ? "Create account" : "Log in"}</Button>
      </fieldset>
      {errors.root && <Alert tone="error" role="alert">{errors.root.message}</Alert>}
      <p className="text-center text-sm text-muted-foreground"><Link className="font-medium text-link underline-offset-4 hover:underline" href={isRegister ? "/login" : "/register"}>{isRegister ? "Already have an account? Log in" : "Create an account"}</Link></p>
    </form>
  );
}
