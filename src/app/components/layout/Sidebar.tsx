import { Search } from "lucide-react";
import type { ProfileListItem } from "../../types";
import PatientList from "../patient/PatientList";

interface SidebarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  profiles: ProfileListItem[];
  selectedProfileId?: string;
  onSelectProfile: (profileId: string) => void;
  loading?: boolean;
  error?: string;
}

export default function Sidebar({
  searchText,
  onSearchChange,
  profiles,
  selectedProfileId,
  onSelectProfile,
  loading = false,
  error = "",
}: SidebarProps) {
  return (
    <aside className="flex h-full w-[300px] min-w-[300px] flex-col border-r border-gray-200 bg-white p-4">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" aria-hidden="true" />
        <input
          aria-label="Search profiles"
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, ID, or DOB…"
          className="w-full rounded-sm border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none ring-primary-600 focus:ring-2"
        />
      </div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
        Profiles
      </div>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
          Loading…
        </div>
      ) : (
        <PatientList
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          searchText={searchText}
          onSelectProfile={onSelectProfile}
        />
      )}
    </aside>
  );
}
