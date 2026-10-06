import * as React from "react";
import { cn } from "@/lib/utils";

const widths = { narrow: "max-w-md", default: "max-w-5xl", wide: "max-w-6xl" };

/** Consistent page gutter and max width. The surrounding <main> is rendered once by AppShell. */
export function PageContainer({ size = "default", className, ...props }: React.HTMLAttributes<HTMLDivElement> & { size?: keyof typeof widths }) {
  return <div className={cn("mx-auto w-full px-4 py-6 sm:px-8 sm:py-10", widths[size], className)} {...props} />;
}
