import { useAuthStore } from "../store/authStore";

export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);

  // تابع کمکی برای بررسی اینکه کاربر یک پرمیشن خاص را دارد یا خیر
  const hasPermission = (permission: string): boolean => {
    // اگر کاربر super admin یا همان is_staff باشد، به همه چیز دسترسی کامل دارد
    if (user?.is_staff) {
      return true;
    }

    // بررسی وجود پرمیشن در لیست دسترسی‌های نقش کاربر
    return user?.role?.permissions?.includes(permission) ?? false;
  };

  // تابع کمکی برای بررسی اینکه کاربر حداقل یکی از پرمیشن‌های پاس داده شده را دارد
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (user?.is_staff) {
      return true;
    }

    if (!permissions || permissions.length === 0) {
      return true;
    }

    return permissions.some((permission) => hasPermission(permission));
  };

  // تابع کمکی برای بررسی اینکه کاربر تمامی پرمیشن‌های پاس داده شده را دارد
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (user?.is_staff) {
      return true;
    }

    if (!permissions || permissions.length === 0) {
      return true;
    }

    return permissions.every((permission) => hasPermission(permission));
  };

  return {
    permissions: user?.role?.permissions ?? [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isStaff: !!user?.is_staff,
  };
};
