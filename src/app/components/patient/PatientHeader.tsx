import type { ReviewProfileSummary } from "../../../api/client";
import { ageFromDob, formatDate } from "../../../utils/dateUtils";

interface PatientHeaderProps {
  profile: ReviewProfileSummary;
}

export default function PatientHeader({ profile }: PatientHeaderProps) {
  const dob = profile.dob ?? "";
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-2xl font-semibold text-gray-900">{profile.name}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-700 lg:grid-cols-5">
        <p>
          <span className="font-semibold">ID:</span> {profile.id}
        </p>
        <p>
          <span className="font-semibold">Age:</span> {dob ? ageFromDob(dob) : "—"}
        </p>
        <p>
          <span className="font-semibold">Gender:</span> {profile.gender ?? "—"}
        </p>
        <p>
          <span className="font-semibold">DOB:</span> {dob ? formatDate(dob) : "—"}
        </p>
      </div>
    </div>
  );
}
