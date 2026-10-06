"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/http";
import { organizationsApi, type Organization } from "@/lib/organizations-api";
import { organizationSchema, type OrganizationValues } from "./create-organization-form";
import { organizationsKey } from "./organization-provider";

export function EditOrganizationForm({ organization }: { organization: Organization }) {
  const client = useQueryClient();
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema), defaultValues: { name: organization.name, slug: organization.slug },
  });
  const update = useMutation({
    mutationFn: (values: OrganizationValues) => organizationsApi.update(organization.id, values),
    onSuccess: () => client.invalidateQueries({ queryKey: organizationsKey }),
    onError: error => {
      setError("root", { message: error instanceof ApiError ? error.message : "Unable to connect. Please try again." });
      if (error instanceof ApiError) {
        for (const field of ["name", "slug"] as const) if (error.fieldErrors[field]) setError(field, { message: error.fieldErrors[field] });
      }
    },
  });
  return (
    <form noValidate aria-busy={update.isPending} className="space-y-4"
      onSubmit={event => { void handleSubmit(values => { if (!update.isPending) update.mutate(values); })(event); }}>
      <TextField label="Name" error={errors.name?.message} {...register("name")} />
      <TextField label="Slug" autoComplete="off" error={errors.slug?.message} {...register("slug")} />
      {errors.root && <Alert tone="error" role="alert">{errors.root.message}</Alert>}
      {update.isSuccess && !isDirty && <Alert tone="success" role="status">Changes saved.</Alert>}
      <Button type="submit" disabled={update.isPending || !isDirty}>{update.isPending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
