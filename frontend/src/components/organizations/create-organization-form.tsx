"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/http";
import { organizationsApi, type Organization } from "@/lib/organizations-api";
import { slugify } from "@/lib/permissions";
import { organizationsKey } from "./organization-provider";

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  slug: z.string().trim().toLowerCase().min(2, "Slug must be at least 2 characters").max(48, "Slug must be at most 48 characters")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, digits and single hyphens"),
});
export type OrganizationValues = z.infer<typeof organizationSchema>;

export function CreateOrganizationForm({ onCreated }: { onCreated: (organization: Organization) => void }) {
  const client = useQueryClient();
  const { register, handleSubmit, setError, setValue, formState: { errors, dirtyFields } } = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema), defaultValues: { name: "", slug: "" },
  });
  const create = useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: async organization => {
      await client.invalidateQueries({ queryKey: organizationsKey });
      onCreated(organization);
    },
    onError: error => {
      setError("root", { message: error instanceof ApiError ? error.message : "Unable to connect. Please try again." });
      if (error instanceof ApiError) {
        for (const field of ["name", "slug"] as const) if (error.fieldErrors[field]) setError(field, { message: error.fieldErrors[field] });
      }
    },
  });
  const name = register("name", {
    onChange: event => { if (!dirtyFields.slug) setValue("slug", slugify(event.target.value)); },
  });
  return (
    <form noValidate aria-busy={create.isPending} className="space-y-4"
      onSubmit={event => { void handleSubmit(values => { if (!create.isPending) create.mutate(values); })(event); }}>
      <TextField label="Name" autoComplete="organization" error={errors.name?.message} {...name} />
      <TextField label="Slug" autoComplete="off" error={errors.slug?.message} {...register("slug")} />
      {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
      <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create organization"}</Button>
    </form>
  );
}
