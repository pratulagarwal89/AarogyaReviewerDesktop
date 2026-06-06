import type { ReactNode } from "react";

interface MainContentProps {
  children: ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  return <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>;
}
