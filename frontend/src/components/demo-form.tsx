"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormValues = z.infer<typeof schema>;

export function DemoForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          {...register("name")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p role="alert" className="text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Submit
      </Button>
    </form>
  );
}
