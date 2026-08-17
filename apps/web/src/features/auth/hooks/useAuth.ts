import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { loginRequest, registerRequest } from "../api/authApi";
import { useAuthStore } from "../store/authStore";
import type {
  LoginFormData,
  RegisterFormData,
} from "../validation/authSchema";

export const useLogin = () => {
  const navigate = useNavigate();
  const setAuthData = useAuthStore((state) => state.setAuthData);

  return useMutation({
    mutationFn: (loginData: LoginFormData) => loginRequest(loginData),
    onSuccess: (data) => {
      if (data && data.access && data.user) {
        setAuthData({
          access: data.access,
          user: data.user,
        });
        toast.success("Welcome back!");
        navigate("/", { replace: true });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useRegister = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (registerData: RegisterFormData) =>
      registerRequest(registerData),
    onSuccess: () => {
      toast.success("Your account was created. You can now sign in.");
      navigate("/login", { replace: true });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const logoutAction = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return () => {
    logoutAction();
    import("../../tasks/store/useTaskStore").then(module => {
      module.useTaskStore.getState().reset();
    });
    queryClient.clear();
    toast.info("You have been logged out.");
    navigate("/login");
  };
};
