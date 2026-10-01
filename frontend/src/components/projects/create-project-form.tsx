"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/http";
import { suggestKey } from "@/lib/project-key";
import { projectsApi, projectsKey, type Project } from "@/lib/projects-api";

export const projectKeySchema = z.string().trim().toUpperCase()
  .min(2, "Key must be at least 2 characters").max(10, "Key must be at most 10 characters")
  .regex(/^[A-Z][A-Z0-9]*$/, "Use letters and digits, starting with a letter");
export const projectNameSchema = z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters");
export const projectDescriptionSchema = z.string().trim().max(500, "Description must be at most 500 characters");

const createSchema = z.object({ key: projectKeySchema, name: projectNameSchema, description: projectDescriptionSchema });
type CreateValues = z.infer<typeof createSchema>;

export function CreateProjectForm({ organizationId, onCreated, onCancel }: {
  organizationId: string; onCreated: (project: Project) => void; onCancel: () => void;
}) {
  const client = useQueryClient();
  const { register, handleSubmit, setError, setValue, formState: { errors, dirtyFields } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema), defaultValues: { key: "", name: "", description: "" },
  });
  const create = useMutation({
    mutationFn: (values: CreateValues) => projectsApi.create(organizationId, { ...values, description: values.description || undefined }),
    onSuccess: async project => {
      await client.invalidateQueries({ queryKey: projectsKey(organizationId) });
      onCreated(project);
    },
    onError: error => {
      setError("root", { message: error instanceof ApiError ? error.message : "Unable to connect. Please try again." });
      if (error instanceof ApiError) {
        for (const field of ["key", "name", "description"] as const) if (error.fieldErrors[field]) setError(field, { message: error.fieldErrors[field] });
      }
    },
  });
  const name = register("name", { onChange: event => { if (!dirtyFields.key) setValue("key", suggestKey(event.target.value)); } });
  return (
    <form noValidate aria-label="New project" aria-busy={create.isPending} className="max-w-sm space-y-4 rounded-md border p-4"
      onSubmit={event => { void handleSubmit(values => { if (!create.isPending) create.mutate(values); })(event); }}>
      <TextField label="Name" autoComplete="off" error={errors.name?.message} {...name} />
      <TextField label="Key" autoComplete="off" error={errors.key?.message} {...register("key")} />
      <TextField label="Description (optional)" autoComplete="off" error={errors.description?.message} {...register("description")} />
      {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create project"}</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={create.isPending}>Cancel</Button>
      </div>
    </form>
  );
}
