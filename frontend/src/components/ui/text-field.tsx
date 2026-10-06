import * as React from "react";
import { cn } from "@/lib/utils";
import { Input, Textarea } from "./input";

type FieldProps = { label: string; error?: string; hint?: string };
type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & FieldProps;
type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps;

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="block text-[0.8125rem] font-medium text-foreground">{children}</label>;
}
function Feedback({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return <>
    {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p id={`${id}-error`} role="alert" className="text-[0.8125rem] text-danger-soft-foreground">{error}</p>}
  </>;
}
const describedBy = (id: string, error?: string, hint?: string) => error ? `${id}-error` : hint ? `${id}-hint` : undefined;

/** Labelled input that wires the error message to the control for assistive technology. */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;  // unique per instance: two forms on one page may both have a "name" field
    return (
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>{label}</Label>
        <Input id={inputId} ref={ref} aria-invalid={!!error} aria-describedby={describedBy(inputId, error, hint)} className={className} {...props} />
        <Feedback id={inputId} error={error} hint={hint} />
      </div>
    );
  },
);
TextField.displayName = "TextField";

/** Labelled multi-line field with the same error wiring as TextField. */
export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>{label}</Label>
        <Textarea id={inputId} ref={ref} aria-invalid={!!error} aria-describedby={describedBy(inputId, error, hint)} className={cn(className)} {...props} />
        <Feedback id={inputId} error={error} hint={hint} />
      </div>
    );
  },
);
TextAreaField.displayName = "TextAreaField";
