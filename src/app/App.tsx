import { useCallback, useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useNavigate, useParams } from "react-router-dom";
import type { ReviewBundle } from "../api/client";
import { getReviewBundle, listReviewProfiles } from "../api/client";
import { profileFuseOptions } from "../utils/searchUtils";
import { mapProfileListItem } from "./utils/profileMappers";
import type { ProfileListItem } from "./types";
import MainContent from "./components/layout/MainContent";
import Sidebar from "./components/layout/Sidebar";
import AppLayout from "./components/layout/AppLayout";
import PatientHeader from "./components/patient/PatientHeader";
import DocumentTab from "./components/tabs/DocumentTab";
import LabChatPanel from "./components/tabs/LabChatPanel";
import IntakeTab from "./components/tabs/IntakeTab";
import ProfileTab from "./components/tabs/ProfileTab";
import TabNavigation, { type TabId } from "./components/tabs/TabNavigation";

function normalizeTab(tab?: string): TabId {
  if (tab === "profile" || tab === "intake" || tab === "documents" || tab === "lab") {
    return tab;
  }
  return "documents";
}

export default function MedReviewPage() {
  const navigate = useNavigate();
  const params = useParams<{ patientId?: string; tab?: string }>();
  const selectedProfileId = params.patientId;
  const activeTab = normalizeTab(params.tab);

  const [profileList, setProfileList] = useState<ProfileListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [bundle, setBundle] = useState<ReviewBundle | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleError, setBundleError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    listReviewProfiles({})
      .then((res) => {
        if (!cancelled) {
          setProfileList((res.items ?? []).map(mapProfileListItem));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setListError(err instanceof Error ? err.message : "Failed to load profiles");
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProfileId) {
      Promise.resolve().then(() => {
        setBundle(null);
        setBundleError("");
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      setBundleLoading(true);
      setBundleError("");
    });
    getReviewBundle(selectedProfileId)
      .then((res) => {
        if (cancelled) return;
        // Intake-only review UI: discard lab_reports from the bundle (API still returns them).
        setBundle({ ...res, lab_reports: [] });
      })
      .catch((err) => {
        if (!cancelled) {
          setBundleError(err instanceof Error ? err.message : "Failed to load profile");
        }
      })
      .finally(() => {
        if (!cancelled) setBundleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProfileId]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const fuse = useMemo(() => new Fuse(profileList, profileFuseOptions), [profileList]);
  const filteredProfiles = useMemo(() => {
    if (!debouncedSearch) return profileList;
    return fuse.search(debouncedSearch).map((r) => r.item);
  }, [profileList, debouncedSearch, fuse]);

  const onSelectProfile = useCallback(
    (profileId: string) => {
      navigate(`/patient/${profileId}/documents`);
    },
    [navigate],
  );

  const onChangeTab = useCallback(
    (tab: TabId) => {
      if (!selectedProfileId) return;
      navigate(`/patient/${selectedProfileId}/${tab}`);
    },
    [navigate, selectedProfileId],
  );

  return (
    <AppLayout
      sidebar={
        <Sidebar
          searchText={searchInput}
          onSearchChange={setSearchInput}
          profiles={filteredProfiles}
          selectedProfileId={selectedProfileId}
          onSelectProfile={onSelectProfile}
          loading={listLoading}
          error={listError}
        />
      }
      main={
        <MainContent>
          {!selectedProfileId ? (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-gray-600">
              Select a profile from the left sidebar to begin review.
            </div>
          ) : bundleError ? (
            <div className="flex h-full items-center justify-center rounded-md border border-red-200 bg-red-50 p-6 text-red-700">
              {bundleError}
            </div>
          ) : bundleLoading ? (
            <div className="flex h-full items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600">
              Loading profile…
            </div>
          ) : bundle ? (
            <div className="space-y-4">
              <PatientHeader profile={bundle.profile} />
              <TabNavigation activeTab={activeTab} onChange={onChangeTab} />
              {activeTab === "documents" && (
                <DocumentTab bundle={bundle} />
              )}
              {activeTab === "profile" && (
                <ProfileTab profile={bundle.profile} patientHistory={bundle.patient_history} />
              )}
              {activeTab === "intake" && (
                <IntakeTab
                  userIntakeForm={bundle.user_intake_form}
                  patientHistory={bundle.patient_history}
                />
              )}
              {activeTab === "lab" && <LabChatPanel bundle={bundle} />}
            </div>
          ) : null}
        </MainContent>
      }
    />
  );
}
