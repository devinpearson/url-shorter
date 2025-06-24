import * as React from "react";

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Dialog = ({ open, onClose, children, className = "", ...props }: DialogProps) => {
  if (!open) return null;
  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 ${className}`} {...props}>
      <div className="bg-white rounded shadow p-6 relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>&times;</button>
        {children}
      </div>
    </div>
  );
};
