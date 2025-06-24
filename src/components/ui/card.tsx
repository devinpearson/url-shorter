import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded border bg-white p-4 shadow ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";
