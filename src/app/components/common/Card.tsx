import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className = "" }: CardProps) {
  return (
    <section className={`rounded-md border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      {title ? <h3 className="mb-3 text-base font-semibold text-gray-900">{title}</h3> : null}
      {children}
    </section>
  );
}
