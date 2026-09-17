import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AUTH_STORAGE_KEY } from "../../../core/config/constants";
import type { User } from "../types/authTypes";

interface AuthState {
  user: User | null;
  access: string | null;
  refresh: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setAuthData: (data: { user: User; access: string; refresh?: string }) => void;
  setTokens: (tokens: { access: string; refresh?: string }) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
}

const initialState: AuthState = {
  user: null,
  access: null,
  refresh: null,
  isAuthenticated: false,
  isLoading: true,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuthData: (data) => {
        set({
          user: data.user,
          access: data.access,
          refresh: data.refresh || null,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setTokens: (tokens) => {
        set((state) => ({
          access: tokens.access,
          refresh: tokens.refresh !== undefined ? tokens.refresh : state.refresh,
        }));
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (!currentUser) return;

        set(() => ({
          user: { ...currentUser, ...userData } as User,
        }));
      },

      logout: () => {
        set({
          user: null,
          access: null,
          refresh: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        access: state.access,
        refresh: state.refresh,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      },
    }
  )
);
