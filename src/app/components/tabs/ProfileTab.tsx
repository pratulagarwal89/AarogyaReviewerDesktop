import type { PatientHistoryData, ReviewProfileSummary } from "../../../api/client";
import { ageFromDob, formatDate } from "../../../utils/dateUtils";
import Card from "../common/Card";
import ReadOnlyField from "../common/ReadOnlyField";

interface ProfileTabProps {
  profile: ReviewProfileSummary;
  patientHistory: PatientHistoryData | Record<string, unknown> | unknown;
}

function isPatientHistory(
  h: PatientHistoryData | Record<string, unknown> | unknown,
): h is PatientHistoryData {
  return h !== null && typeof h === "object" && !Array.isArray(h);
}

export default function ProfileTab({ profile, patientHistory }: ProfileTabProps) {
  const history = isPatientHistory(patientHistory) ? patientHistory : null;
  const patientInfo = history?.patient;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Personal Information">
        <div className="grid gap-3 md:grid-cols-2">
          <ReadOnlyField label="Full Name" value={profile.name} />
          <ReadOnlyField label="Date of Birth" value={profile.dob ? formatDate(profile.dob) : undefined} />
          <ReadOnlyField label="Age" value={profile.dob ? String(ageFromDob(profile.dob)) : undefined} />
          <ReadOnlyField label="Gender" value={profile.gender} />
          <ReadOnlyField label="Profile ID" value={profile.id} />
          <ReadOnlyField label="Phone Number" value={(patientInfo as { phone?: string } | undefined)?.phone} />
          <ReadOnlyField label="Email Address" value={(patientInfo as { email?: string } | undefined)?.email} />
        </div>
      </Card>

      <Card title="Address">
        <div className="grid gap-3">
          <ReadOnlyField
            label="Street Address"
            value={(patientInfo as { address?: { street?: string } } | undefined)?.address?.street}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <ReadOnlyField
              label="City"
              value={(patientInfo as { address?: { city?: string } } | undefined)?.address?.city}
            />
            <ReadOnlyField
              label="State"
              value={(patientInfo as { address?: { state?: string } } | undefined)?.address?.state}
            />
            <ReadOnlyField
              label="ZIP"
              value={(patientInfo as { address?: { zip?: string } } | undefined)?.address?.zip}
            />
            <ReadOnlyField
              label="Country"
              value={(patientInfo as { address?: { country?: string } } | undefined)?.address?.country}
            />
          </div>
        </div>
      </Card>

      <Card title="Insurance Information">
        <div className="grid gap-3 md:grid-cols-2">
          <ReadOnlyField
            label="Insurance Provider"
            value={(patientInfo as { insurance?: { provider?: string } } | undefined)?.insurance?.provider}
          />
          <ReadOnlyField
            label="Policy Number"
            value={(patientInfo as { insurance?: { policyNumber?: string } } | undefined)?.insurance?.policyNumber}
          />
          <ReadOnlyField
            label="Group Number"
            value={(patientInfo as { insurance?: { groupNumber?: string } } | undefined)?.insurance?.groupNumber}
          />
          <ReadOnlyField
            label="Effective Date"
            value={(patientInfo as { insurance?: { effectiveDate?: string } } | undefined)?.insurance?.effectiveDate}
          />
        </div>
      </Card>

      <Card title="Emergency Contact">
        <div className="grid gap-3 md:grid-cols-2">
          <ReadOnlyField
            label="Contact Name"
            value={(patientInfo as { emergencyContact?: { name?: string } } | undefined)?.emergencyContact?.name}
          />
          <ReadOnlyField
            label="Relationship"
            value={(patientInfo as { emergencyContact?: { relationship?: string } } | undefined)?.emergencyContact?.relationship}
          />
          <ReadOnlyField
            label="Phone Number"
            value={(patientInfo as { emergencyContact?: { phone?: string } } | undefined)?.emergencyContact?.phone}
          />
        </div>
      </Card>
    </div>
  );
}
