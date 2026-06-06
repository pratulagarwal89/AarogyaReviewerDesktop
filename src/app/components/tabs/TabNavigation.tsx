import type { ReactNode } from "react";

export type TabId = "documents" | "profile" | "intake" | "lab";

interface TabNavigationProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-medium transition ${
        active ? "bg-primary-600 text-white" : "bg-transparent text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function TabNavigation({ activeTab, onChange }: TabNavigationProps) {
  return (
    <nav aria-label="Patient data tabs" className="inline-flex rounded-md border border-gray-200 bg-white p-1">
      <TabButton active={activeTab === "documents"} onClick={() => onChange("documents")}>
        Documents
      </TabButton>
      <TabButton active={activeTab === "profile"} onClick={() => onChange("profile")}>
        Profile
      </TabButton>
      <TabButton active={activeTab === "intake"} onClick={() => onChange("intake")}>
        Intake Form
      </TabButton>
      <TabButton active={activeTab === "lab"} onClick={() => onChange("lab")}>
        Lab Q&A
      </TabButton>
    </nav>
  );
}
