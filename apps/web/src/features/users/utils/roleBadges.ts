import {
  Code1,
  Crown,
  Headphone,
  Hierarchy,
  User,
} from "iconsax-reactjs";

import type { Role } from "../../roles/types";

const defaultBadgeClass =
  "bg-base-200/70 text-base-content/80 border border-base-content/10 shadow-sm";

const roleBadgeClassMap: Record<string, string> = {
  "Super Admin":
    "bg-gradient-to-r from-fuchsia-500/20 via-pink-500/20 to-rose-500/20 text-fuchsia-300 border border-fuchsia-400/30 shadow-[0_0_12px_rgba(217,70,239,0.18)]",

  Support:
    "bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.18)]",

  "Regular User":
    "bg-gradient-to-r from-slate-400/10 to-zinc-300/10 text-base-content/75 border border-base-content/10 shadow-sm",

  Frontend:
    "bg-gradient-to-r from-pink-500/20 via-violet-500/20 to-purple-500/20 text-pink-300 border border-pink-400/30 shadow-[0_0_12px_rgba(236,72,153,0.18)]",

  Backend:
    "bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-lime-500/20 text-emerald-300 border border-emerald-400/30 shadow-[0_0_12px_rgba(16,185,129,0.18)]",
};

const roleIconMap = {
  "Super Admin": Crown,
  Support: Headphone,
  "Regular User": User,
  Frontend: Code1,
  Backend: Hierarchy,
} as const;

export const getRoleBadgeClass = (roleName: string): string => {
  return roleBadgeClassMap[roleName] || defaultBadgeClass;
};

export const getRoleIcon = (roleName: string) => {
  return roleIconMap[roleName as keyof typeof roleIconMap] || null;
};

export const getRoleName = (
  roleId: number | null | undefined,
  roles: Role[],
): string | null => {
  if (!roleId) return null;

  return roles.find((role) => role.id === roleId)?.name || null;
};
