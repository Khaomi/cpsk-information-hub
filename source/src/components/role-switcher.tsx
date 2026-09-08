"use client";

import { useRole, Role } from "@/src/components/role-context";

const ROLES: Role[] = ["student", "staff", "admin"];

// TODO: remove this component entirely once real authentication is connected.
export default function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-stone-900 text-white rounded-lg shadow-lg px-2 py-1.5 flex items-center gap-1 text-xs">
      <span className="px-2 text-stone-400">Viewing as:</span>
      {ROLES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setRole(r)}
          className={`px-2 py-1 rounded capitalize transition-colors ${
            role === r ? "bg-teal-600" : "hover:bg-stone-700"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
