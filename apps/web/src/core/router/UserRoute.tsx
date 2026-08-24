import { useAuthStore } from "../../features/auth/store/authStore";

interface UserRouteProps {
  children: React.ReactNode;
}

export const UserRoute = ({ children }: UserRouteProps) => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
