"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
  return (
    <form noValidate onSubmit={(event) => { void handleSubmit(submit)(event); }} className="space-y-4" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        {fields.map(field => (
          <div key={field} className="space-y-1">
            <label htmlFor={field} className="block text-sm font-medium">{field === "name" ? "Name" : field === "email" ? "Email" : "Password"}</label>
            <input id={field} type={field === "password" ? "password" : field === "email" ? "email" : "text"}
              autoComplete={field === "password" ? (isRegister ? "new-password" : "current-password") : field === "email" ? "username" : "name"}
              {...register(field)} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${field}-error` : undefined}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            {errors[field] && <p id={`${field}-error`} role="alert" className="text-sm text-red-600">{errors[field]?.message}</p>}
          </div>
        ))}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Please wait…" : isRegister ? "Create account" : "Log in"}</Button>
      </fieldset>
      {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
      <p className="text-sm"><Link className="underline" href={isRegister ? "/login" : "/register"}>{isRegister ? "Already have an account? Log in" : "Create an account"}</Link></p>
    </form>
  );
}
