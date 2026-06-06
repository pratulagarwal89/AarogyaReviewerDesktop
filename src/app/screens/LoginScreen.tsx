import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearTokens,
  getApiBaseUrl,
  isLoggedIn,
  login,
  listReviewProfiles,
  setApiBaseUrl,
  setTokens,
} from "../../api/client";
import Button from "../components/common/Button";

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  if (isLoggedIn()) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      setApiBaseUrl(apiUrl.trim() || "http://localhost:8080");
      const res = await login(email.trim(), password);
      setTokens(res.access_token, res.refresh_token);

      try {
        await listReviewProfiles({});
      } catch {
        clearTokens();
        setError(
          "Reviewer access denied. Your email is not on the reviewer allowlist.",
        );
        setLoading(false);
        return;
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        aria-label="Login form"
      >
        <h2 className="mb-6 text-center text-xl font-semibold text-gray-900">
          MedReview
        </h2>
        {error && (
          <div
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}
        <div className="mb-4">
          <label
            htmlFor="api-url"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            API URL
          </label>
          <input
            id="api-url"
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:8080"
            className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
            autoComplete="url"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <div className="mb-6">
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
