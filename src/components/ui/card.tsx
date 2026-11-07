import * as React from "react";
import { cn } from "../../lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("border-border rounded-lg border bg-white p-4 shadow-sm", className)}
    {...props}
  />
));
Card.displayName = "Card";
