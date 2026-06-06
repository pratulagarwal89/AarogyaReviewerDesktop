import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
}

export default function Button({ children, className = "", variant = "secondary", type = "button", ...props }: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "bg-primary-600 text-white hover:bg-primary-700"
      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";

  return (
    <button
      className={`rounded-sm px-4 py-2 text-sm font-medium transition ${variantClass} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
