import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Search, Users as UsersIcon } from "lucide-react";
import {
  getAdminUser,
  listAdminUsers,
  type AdminUserDetail,
  type AdminUserListItem,
  type AdminUserProfileItem,
} from "../../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import Button from "../components/common/Button";
import { ageFromDob, formatDate } from "../../utils/dateUtils";

function initialsOf(name?: string | null, fallback?: string): string {
  const source = (name && name.trim()) || fallback || "?";
  const parts = source.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

function relativeUploaded(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDate(value);
}

interface UsersTableProps {
  users: AdminUserListItem[];
  selectedUserId?: string;
  onSelect: (userId: string) => void;
  searchText: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
}

function UsersTable({
  users,
  selectedUserId,
  onSelect,
  searchText,
  onSearchChange,
  loading,
  error,
  onRetry,
}: UsersTableProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            aria-label="Search users by name, phone, or email"
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, email, or user ID…"
            className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <div className="m-4 flex items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <Button onClick={onRetry} className="!py-1 !px-3 text-xs">
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="p-6 text-sm text-slate-600">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No users match this search.</div>
        ) : (
          <table className="w-full table-fixed text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="w-[28%] px-4 py-2">User</th>
                <th className="w-[26%] px-4 py-2">Email</th>
                <th className="w-[10%] px-4 py-2 text-right">Profiles</th>
                <th className="w-[10%] px-4 py-2 text-right">Reports</th>
                <th className="w-[10%] px-4 py-2 text-right">Issues</th>
                <th className="w-[16%] px-4 py-2">Last Upload</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const active = user.id === selectedUserId;
                return (
                  <tr
                    key={user.id}
                    onClick={() => onSelect(user.id)}
                    className={`cursor-pointer border-t border-slate-100 transition ${
                      active ? "bg-sky-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                          {initialsOf(user.name, user.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">
                            {user.name?.trim() || "—"}
                          </div>
                          <div className="truncate font-mono text-xs text-slate-500">
                            {user.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700">
                      <div className="truncate" title={user.email}>
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right text-slate-700">
                      {user.profile_count}
                    </td>
                    <td className="px-4 py-3 align-top text-right text-slate-700">
                      {user.document_count}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {user.issue_count > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {user.issue_count}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700">
                      {relativeUploaded(user.last_upload_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

interface ProfileCardProps {
  profile: AdminUserProfileItem;
  userId: string;
}

function ProfileCard({ profile, userId }: ProfileCardProps) {
  const navigate = useNavigate();
  const age = profile.dob ? ageFromDob(profile.dob) : null;
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {profile.name}
            </h3>
            {profile.is_default ? (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                Self
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Profile ID <span className="font-mono">{profile.id.slice(0, 8)}</span>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() =>
            navigate(`/admin/users/${userId}/profiles/${profile.id}/reports`)
          }
          className="bg-sky-600 hover:bg-sky-700"
        >
          View Reports
        </Button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
        <div>
          <dt className="text-slate-500">Age</dt>
          <dd className="text-slate-900">{age ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Gender</dt>
          <dd className="text-slate-900">{profile.gender || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Reports</dt>
          <dd className="text-slate-900">{profile.document_count}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Last upload</dt>
          <dd className="text-slate-900">{relativeUploaded(profile.last_upload_at)}</dd>
        </div>
      </dl>
      {profile.issue_count > 0 ? (
        <p className="mt-3 text-xs text-amber-700">
          {profile.issue_count} {profile.issue_count === 1 ? "report" : "reports"} need review
        </p>
      ) : null}
    </article>
  );
}

interface UserSummaryPanelProps {
  detail?: AdminUserDetail;
  loading: boolean;
  error: string;
  onRetry: () => void;
  selectedUserId?: string;
}

function UserSummaryPanel({
  detail,
  loading,
  error,
  onRetry,
  selectedUserId,
}: UserSummaryPanelProps) {
  if (!selectedUserId) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
        <UsersIcon className="mb-2 h-6 w-6 text-slate-400" aria-hidden="true" />
        Select a user from the table to see their profiles.
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-full flex-col gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
        <Button onClick={onRetry} className="self-start !py-1 !px-3 text-xs">
          Retry
        </Button>
      </div>
    );
  }
  if (loading || !detail) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading user…
      </div>
    );
  }

  const { user, profiles } = detail;
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {initialsOf(user.name, user.email)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              {user.name?.trim() || "—"}
            </h2>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-600">
          <div>
            <dt>User ID</dt>
            <dd className="mt-0.5 truncate font-mono text-slate-900" title={user.id}>
              {user.id.slice(0, 8)}…
            </dd>
          </div>
          <div>
            <dt>Profiles</dt>
            <dd className="mt-0.5 text-slate-900">{user.profile_count}</dd>
          </div>
          <div>
            <dt>Reports</dt>
            <dd className="mt-0.5 text-slate-900">{user.document_count}</dd>
          </div>
          <div>
            <dt>Lab reports</dt>
            <dd className="mt-0.5 text-slate-900">{user.lab_report_count}</dd>
          </div>
          <div>
            <dt>Open issues</dt>
            <dd className="mt-0.5 text-slate-900">{user.issue_count}</dd>
          </div>
          <div>
            <dt>Last upload</dt>
            <dd className="mt-0.5 text-slate-900">{relativeUploaded(user.last_upload_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Profiles ({profiles.length})
          </h3>
        </div>
        {profiles.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            This user has no profiles yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} userId={user.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [userDetail, setUserDetail] = useState<AdminUserDetail | undefined>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [listReloadKey, setListReloadKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      setListLoading(true);
      setListError("");
    });
    listAdminUsers(debouncedSearch ? { q: debouncedSearch } : {})
      .then((res) => {
        if (cancelled) return;
        const items = res.items ?? [];
        setUsers(items);
        setSelectedUserId((prev) => {
          if (prev && items.some((u) => u.id === prev)) return prev;
          return items[0]?.id;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setListError(err instanceof Error ? err.message : "Failed to load users");
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, listReloadKey]);

  useEffect(() => {
    if (!selectedUserId) {
      queueMicrotask(() => {
        setUserDetail(undefined);
        setDetailError("");
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      setDetailLoading(true);
      setDetailError("");
    });
    getAdminUser(selectedUserId)
      .then((detail) => {
        if (!cancelled) setUserDetail(detail);
      })
      .catch((err) => {
        if (!cancelled)
          setDetailError(err instanceof Error ? err.message : "Failed to load user");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUserId, detailReloadKey]);

  const handleSelect = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  const onRetryList = useCallback(() => setListReloadKey((k) => k + 1), []);
  const onRetryDetail = useCallback(() => setDetailReloadKey((k) => k + 1), []);

  const layoutHeight = useMemo(() => "h-[calc(100vh-128px)]", []);

  return (
    <AdminLayout>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Users &amp; Profiles</h1>
        <p className="mt-1 text-sm text-slate-600">
          Browse users and review their family profiles.
        </p>
      </div>

      <div className={`grid grid-cols-1 gap-4 lg:grid-cols-[58fr_42fr] ${layoutHeight}`}>
        <UsersTable
          users={users}
          selectedUserId={selectedUserId}
          onSelect={handleSelect}
          searchText={searchInput}
          onSearchChange={setSearchInput}
          loading={listLoading}
          error={listError}
          onRetry={onRetryList}
        />
        <UserSummaryPanel
          detail={userDetail}
          loading={detailLoading}
          error={detailError}
          onRetry={onRetryDetail}
          selectedUserId={selectedUserId}
        />
      </div>
    </AdminLayout>
  );
}
