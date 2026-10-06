import * as React from "react";
import { CircleAlert, CircleCheckBig, Info, TriangleAlert } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: {
    tone: {
      error: "border-danger-border bg-danger-soft text-danger-soft-foreground",
      success: "border-success-border bg-success-soft text-success-soft-foreground",
      warning: "border-warning-border bg-warning-soft text-warning-soft-foreground",
      info: "border-info-border bg-info-soft text-info-soft-foreground",
    },
  },
  defaultVariants: { tone: "info" },
});
const icons = { error: CircleAlert, success: CircleCheckBig, warning: TriangleAlert, info: Info };

type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants> & { action?: React.ReactNode };

/** Callout. The caller sets the role (alert for errors, status for notices) so semantics stay explicit. */
export function Alert({ tone = "info", className, children, action, ...props }: AlertProps) {
  const Icon = icons[tone ?? "info"];
  return (
    <div className={cn(alertVariants({ tone }), className)} {...props}>
      <Icon aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">{children}</div>
      {action}
    </div>
  );
}
