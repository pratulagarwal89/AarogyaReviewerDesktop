import type { ReactNode } from "react";
import Header from "./Header";

interface AppLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
}

export default function AppLayout({ sidebar, main }: AppLayoutProps) {
  return (
    <div className="h-screen min-w-[1200px] bg-gray-50">
      <Header />
      <div className="flex h-[calc(100vh-64px)]">
        {sidebar}
        {main}
      </div>
    </div>
  );
}
