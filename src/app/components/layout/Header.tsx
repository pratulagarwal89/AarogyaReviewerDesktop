import { LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../../../api/client";
import Button from "../common/Button";

export default function Header() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-2xl font-semibold text-gray-900">MedReview</h1>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
          <UserRound className="h-4 w-4" aria-hidden="true" />
          Reviewer
        </span>
        <Button
          variant="secondary"
          onClick={handleLogout}
          className="inline-flex items-center gap-2"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </Button>
      </div>
    </header>
  );
}
