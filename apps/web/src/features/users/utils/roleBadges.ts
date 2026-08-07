import {
  Code1,
  Crown,
  Headphone,
  Hierarchy,
  User,
  Teacher, // مناسب برای لید تیم
  MoneyArchive, // مناسب برای حسابدار
  People, // مناسب برای منابع انسانی (HR)
  Setting, // آیکون پیش‌فرض برای نقش‌های شخصی‌سازی شده سفارشی
} from "iconsax-reactjs";

import type { Role } from "../../roles/types";

// استایل‌های پیش‌فرض و ثابت برای نقش‌های سیستمی معروف
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

  // بج‌های شیک و جذاب برای نقش‌های بیزنسی جدید
  "Team Lead":
    "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 text-amber-300 border border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.18)]",

  Accountant:
    "bg-gradient-to-r from-violet-500/20 via-indigo-500/20 to-purple-500/20 text-violet-300 border border-violet-400/30 shadow-[0_0_12px_rgba(139,92,246,0.18)]",

  HR: "bg-gradient-to-r from-rose-500/20 via-red-500/20 to-pink-500/20 text-rose-300 border border-rose-400/30 shadow-[0_0_12px_rgba(244,63,94,0.18)]",
};

const roleIconMap = {
  "Super Admin": Crown,
  Support: Headphone,
  "Regular User": User,
  Frontend: Code1,
  Backend: Hierarchy,
  "Team Lead": Teacher,
  Accountant: MoneyArchive,
  HR: People,
} as const;

// لیست پالت‌های رنگی جذاب برای نقش‌های کاملاً داینامیک و شخصی‌سازی شده (Custom Roles)
const dynamicColorPalettes = [
  "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-300 border border-emerald-500/20",
  "bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-300 border border-purple-500/20",
  "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-300 border border-amber-500/20",
  "bg-gradient-to-r from-pink-500/10 to-rose-500/10 text-pink-300 border border-pink-500/20",
  "bg-gradient-to-r from-sky-500/10 to-cyan-500/10 text-sky-300 border border-sky-500/20",
];

// تابع تولید هش ساده بر اساس نام نقش برای انتخاب رنگ یکتا و ثابت
const getHashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

export const getRoleBadgeClass = (roleName: string): string => {
  // اگر نقش سیستمی بود، استایل اختصاصی رو برگردون
  if (roleBadgeClassMap[roleName]) {
    return roleBadgeClassMap[roleName];
  }

  // برای نقش‌های کاستوم، بر اساس نامشون یک رنگ ثابت از لیست پالت‌ها برمی‌گردونیم
  const hash = getHashCode(roleName);
  const index = hash % dynamicColorPalettes.length;
  return dynamicColorPalettes[index];
};

export const getRoleIcon = (roleName: string) => {
  if (roleName in roleIconMap) {
    return roleIconMap[roleName as keyof typeof roleIconMap];
  }
  // برای نقش‌های کاستوم و جدید، یک آیکون پیش‌فرض برمی‌گردونیم
  return Setting;
};

export const getRoleName = (
  roleId: number | null | undefined,
  roles: Role[],
): string | null => {
  if (!roleId) return null;

  return roles.find((role) => role.id === roleId)?.name || null;
};
