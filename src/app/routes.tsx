import { Navigate, Route, Routes } from "react-router-dom";
import MedReviewPage from "./App";
import LoginScreen from "./screens/LoginScreen";
import AdminUsersScreen from "./screens/AdminUsersScreen";
import ProfileReportsScreen from "./screens/ProfileReportsScreen";
import ReportReviewScreen from "./screens/ReportReviewScreen";
import RequireAuth from "./components/auth/RequireAuth";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route
        path="/"
        element={<Navigate to="/admin/users" replace />}
      />
      <Route
        path="/admin/users"
        element={
          <RequireAuth>
            <AdminUsersScreen />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/users/:userId/profiles/:profileId/reports"
        element={
          <RequireAuth>
            <ProfileReportsScreen />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/reports/:documentId"
        element={
          <RequireAuth>
            <ReportReviewScreen />
          </RequireAuth>
        }
      />
      {/* Legacy single-profile review UI — kept for backward compatibility */}
      <Route
        path="/patient/:patientId/:tab?"
        element={
          <RequireAuth>
            <MedReviewPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/admin/users" replace />} />
    </Routes>
  );
}
