import * as React from "react";
import { cn } from "@/lib/utils";

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

/** Labelled input that wires the error message to the control for assistive technology. */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="space-y-1">
        <label htmlFor={inputId} className="block text-sm font-medium">{label}</label>
        <input id={inputId} ref={ref} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn("w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2", className)} {...props} />
        {error && <p id={`${inputId}-error`} role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);
TextField.displayName = "TextField";
