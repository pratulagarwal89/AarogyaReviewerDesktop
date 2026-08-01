import type { ReactNode } from "react";
import { LogOut, ShieldCheck, Users } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { clearTokens } from "../../../api/client";
import Button from "../common/Button";
import { ToastProvider } from "./Toast";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/verification", label: "Verification", icon: ShieldCheck },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  return (
    <ToastProvider>
      <div className="min-h-screen min-w-[1200px] bg-slate-50">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">MedReview</h1>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600">
              Admin
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="inline-flex items-center gap-2"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </Button>
        </header>

        <div className="flex min-h-[calc(100vh-64px)]">
          <aside className="flex w-[220px] min-w-[220px] flex-col gap-1 border-r border-slate-200 bg-white p-3">
            <nav aria-label="Admin sections" className="flex flex-col gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-4 overflow-x-hidden p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
