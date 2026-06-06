import type { ProfileListItem } from "../../types";
import { formatDate } from "../../../utils/dateUtils";

interface PatientListProps {
  profiles: ProfileListItem[];
  selectedProfileId?: string;
  searchText: string;
  onSelectProfile: (profileId: string) => void;
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const lower = text.toLowerCase();
  const start = lower.indexOf(query.toLowerCase());
  if (start < 0) return text;
  const end = start + query.length;
  return `${text.slice(0, start)}<mark class="bg-yellow-100 px-0.5">${text.slice(start, end)}</mark>${text.slice(end)}`;
}

export default function PatientList({
  profiles,
  selectedProfileId,
  searchText,
  onSelectProfile,
}: PatientListProps) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
        No profiles found
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto pr-1">
      {profiles.map((profile) => {
        const selected = selectedProfileId === profile.id;
        const dobFormatted = profile.dob ? formatDate(profile.dob) : "—";
        return (
          <button
            key={profile.id}
            type="button"
            onClick={() => onSelectProfile(profile.id)}
            className={`w-full rounded-md border p-3 text-left transition ${
              selected
                ? "border-primary-700 bg-primary-600 text-white"
                : "border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            <p
              className="text-sm font-semibold"
              dangerouslySetInnerHTML={{ __html: highlightText(profile.name, searchText) }}
            />
            <p
              className={`mt-1 text-xs ${selected ? "text-blue-100" : "text-gray-600"}`}
              dangerouslySetInnerHTML={{
                __html: `ID: ${highlightText(profile.id, searchText)} | DOB: ${highlightText(dobFormatted, searchText)}`,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
