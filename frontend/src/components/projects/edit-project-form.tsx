"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/http";
import { projectKey, projectsApi, projectsKey, type Project } from "@/lib/projects-api";
import { projectDescriptionSchema, projectNameSchema } from "./create-project-form";

const editSchema = z.object({ name: projectNameSchema, description: projectDescriptionSchema });
type EditValues = z.infer<typeof editSchema>;

export function EditProjectForm({ project }: { project: Project }) {
  const client = useQueryClient();
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<EditValues>({
    resolver: zodResolver(editSchema), defaultValues: { name: project.name, description: project.description ?? "" },
  });
  const update = useMutation({
    mutationFn: (values: EditValues) => projectsApi.update(project.organizationId, project.id, { ...values, description: values.description || undefined }),
    onSuccess: async updated => {
      client.setQueryData(projectKey(project.organizationId, project.id), updated);
      await client.invalidateQueries({ queryKey: projectsKey(project.organizationId) });
    },
    onError: error => {
      setError("root", { message: error instanceof ApiError ? error.message : "Unable to connect. Please try again." });
      if (error instanceof ApiError) {
        for (const field of ["name", "description"] as const) if (error.fieldErrors[field]) setError(field, { message: error.fieldErrors[field] });
      }
    },
  });
  return (
    <form noValidate aria-label="Edit project" aria-busy={update.isPending} className="space-y-4"
      onSubmit={event => { void handleSubmit(values => { if (!update.isPending) update.mutate(values); })(event); }}>
      <TextField label="Name" autoComplete="off" error={errors.name?.message} {...register("name")} />
      <TextField label="Description (optional)" autoComplete="off" error={errors.description?.message} {...register("description")} />
      {errors.root && <Alert tone="error" role="alert">{errors.root.message}</Alert>}
      {update.isSuccess && !isDirty && <Alert tone="success" role="status">Changes saved.</Alert>}
      <Button type="submit" disabled={update.isPending || !isDirty}>{update.isPending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
