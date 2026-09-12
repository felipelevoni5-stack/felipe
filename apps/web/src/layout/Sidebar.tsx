import { NavLink } from "react-router-dom";
import { navItems } from "./navItems";
import { useAuth } from "../context/AuthContext";

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <span className="text-lg font-semibold text-blue-600">PDV PRO</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {navItems
            .filter((item) => !item.roles || (user && item.roles.includes(user.role)))
            .map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    ].join(" ")
                  }
                >
                  <span>{item.label}</span>
                  {!item.available && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-400">
                      em breve
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>
    </aside>
  );
}
