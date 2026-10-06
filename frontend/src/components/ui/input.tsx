import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared look of every form control so inputs, selects and textareas line up. */
export const controlClass =
  "w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground shadow-card placeholder:text-muted-foreground transition-colors hover:border-muted-foreground/60 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-[invalid=true]:border-danger";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(controlClass, "h-9", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(controlClass, "min-h-20 py-2 leading-6", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string };

/** Native select (keeps keyboard and mobile behaviour) with a consistent chevron. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <span className={cn("relative inline-flex w-full items-center", wrapperClassName)}>
      <select ref={ref} className={cn(controlClass, "h-9 appearance-none pr-8", className)} {...props}>{children}</select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground" />
    </span>
  ),
);
Select.displayName = "Select";
