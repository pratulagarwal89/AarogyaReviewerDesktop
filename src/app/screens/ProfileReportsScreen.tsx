import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ChevronRight, FileText } from "lucide-react";
import {
  getAdminUser,
  getReviewBundle,
  type AdminUserDetail,
  type AdminUserProfileItem,
  type DocumentListItem,
  type ReviewBundle,
  type ReviewLabReport,
} from "../../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import StatusBadge from "../components/admin/StatusBadge";
import Button from "../components/common/Button";
import { ageFromDob, formatDate } from "../../utils/dateUtils";
import { deriveStatusFromDocumentRow } from "../utils/reportStatus";

interface ReportsTableProps {
  documents: DocumentListItem[];
  labByDocument: Map<string, ReviewLabReport>;
  onOpen: (documentId: string) => void;
}

function ReportsTable({ documents, labByDocument, onOpen }: ReportsTableProps) {
  if (documents.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
        No reports uploaded for this profile yet.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="w-[28%] px-4 py-3">Document</th>
              <th className="w-[18%] px-4 py-3">Lab</th>
              <th className="w-[12%] px-4 py-3">Collected</th>
              <th className="w-[12%] px-4 py-3">Uploaded</th>
              <th className="w-[8%] px-4 py-3 text-right">Tests</th>
              <th className="w-[12%] px-4 py-3">Status</th>
              <th className="w-[10%] px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const lab = labByDocument.get(doc.id);
              const status = deriveStatusFromDocumentRow(doc, lab);
              const collected = lab?.report_date ? formatDate(lab.report_date) : "—";
              const uploaded = doc.created_at ? formatDate(doc.created_at) : "—";
              const tests = countTests(lab?.extracted_values);
              return (
                <tr
                  key={doc.id}
                  onClick={() => onOpen(doc.id)}
                  className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-start gap-2">
                      <FileText
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900" title={doc.filename}>
                          {doc.filename}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          <span className="font-mono">{doc.id.slice(0, 8)}</span>
                          {doc.document_type ? ` · ${doc.document_type}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700">{lab?.lab_name || "—"}</td>
                  <td className="px-4 py-3 align-top text-slate-700">{collected}</td>
                  <td className="px-4 py-3 align-top text-slate-700">{uploaded}</td>
                  <td className="px-4 py-3 align-top text-right text-slate-700">{tests}</td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Button
                      variant="primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(doc.id);
                      }}
                      className="bg-sky-600 hover:bg-sky-700 !py-1 !px-3 text-xs"
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Best-effort lab-row count.
 *
 * `lab_reports.extracted_values` shape varies — sometimes it's a flat
 * key→value map ({glucose: 95}), sometimes it's the new structured rows
 * ({tests: [{test_name, ...}]}), and sometimes it's missing entirely.
 * We try the most common shapes and fall back to top-level keys.
 */
function countTests(extractedValues: unknown): number {
  if (extractedValues == null) return 0;
  if (typeof extractedValues !== "object") return 0;
  if (Array.isArray(extractedValues)) return extractedValues.length;
  const obj = extractedValues as Record<string, unknown>;
  const candidateArrays = ["tests", "lab_values", "rows", "results"];
  for (const key of candidateArrays) {
    const value = obj[key];
    if (Array.isArray(value)) return value.length;
  }
  return Object.keys(obj).length;
}

export default function ProfileReportsScreen() {
  const navigate = useNavigate();
  const { userId, profileId } = useParams<{ userId: string; profileId: string }>();
  const [bundle, setBundle] = useState<ReviewBundle | undefined>();
  const [bundleLoading, setBundleLoading] = useState(true);
  const [bundleError, setBundleError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [user, setUser] = useState<AdminUserDetail | undefined>();
  const [profile, setProfile] = useState<AdminUserProfileItem | undefined>();

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    queueMicrotask(() => {
      setBundleLoading(true);
      setBundleError("");
    });
    getReviewBundle(profileId)
      .then((res) => {
        if (!cancelled) setBundle(res);
      })
      .catch((err) => {
        if (!cancelled)
          setBundleError(err instanceof Error ? err.message : "Failed to load reports");
      })
      .finally(() => {
        if (!cancelled) setBundleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, reloadKey]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getAdminUser(userId)
      .then((detail) => {
        if (cancelled) return;
        setUser(detail);
        setProfile(detail.profiles.find((p) => p.id === profileId));
      })
      .catch(() => {
        // Header breadcrumb is best-effort — bundle itself still loads.
      });
    return () => {
      cancelled = true;
    };
  }, [userId, profileId]);

  const documents = useMemo<DocumentListItem[]>(() => {
    if (!bundle?.documents) return [];
    return [...bundle.documents].sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [bundle]);

  const labByDocument = useMemo(() => {
    const map = new Map<string, ReviewLabReport>();
    for (const lab of bundle?.lab_reports ?? []) {
      if (lab.document_source) map.set(lab.document_source, lab);
    }
    return map;
  }, [bundle]);

  const needsReviewCount = useMemo(() => {
    return documents.filter((doc) => {
      const status = deriveStatusFromDocumentRow(doc, labByDocument.get(doc.id));
      return status !== "verified";
    }).length;
  }, [documents, labByDocument]);

  const handleOpen = useCallback(
    (documentId: string) => {
      navigate(`/admin/reports/${documentId}`);
    },
    [navigate],
  );

  return (
    <AdminLayout>
      <nav className="flex items-center gap-1 text-sm text-slate-600" aria-label="Breadcrumb">
        <Link to="/admin/users" className="text-sky-700 hover:underline">
          Users
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <span className="truncate">
          {user?.user.name?.trim() || user?.user.email || "User"}
        </span>
        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <span className="truncate text-slate-900">
          {profile?.name || bundle?.profile?.name || "Profile"}
        </span>
      </nav>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">
              {bundle?.profile?.name || profile?.name || "Profile"}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Profile ID <span className="font-mono">{profileId?.slice(0, 8)}</span>
              {user ? ` · Account: ${user.user.name?.trim() || user.user.email}` : ""}
            </p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-700 sm:grid-cols-5">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Relation</dt>
            <dd>{profile?.is_default ? "Self" : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Age</dt>
            <dd>
              {bundle?.profile?.dob
                ? ageFromDob(bundle.profile.dob)
                : profile?.dob
                  ? ageFromDob(profile.dob)
                  : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Gender</dt>
            <dd>{bundle?.profile?.gender || profile?.gender || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Total reports</dt>
            <dd>{documents.length}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Needs review</dt>
            <dd>{needsReviewCount}</dd>
          </div>
        </dl>
      </section>

      {bundleError ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{bundleError}</span>
          </div>
          <Button onClick={() => setReloadKey((k) => k + 1)} className="!py-1 !px-3 text-xs">
            Retry
          </Button>
        </div>
      ) : bundleLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading reports…
        </div>
      ) : (
        <ReportsTable
          documents={documents}
          labByDocument={labByDocument}
          onOpen={handleOpen}
        />
      )}
    </AdminLayout>
  );
}
