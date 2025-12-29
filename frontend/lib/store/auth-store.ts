import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { clearToken, getCurrentUser, type UserProfile } from "../api/auth";

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  clearUser: () => void;
  checkAuth: () => Promise<void>;
}

const storage = typeof window !== "undefined" ? createJSONStorage(() => window.localStorage) : undefined;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
      clearUser: () => {
        clearToken();
        set({ user: null, isAuthenticated: false });
      },
      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const profile = await getCurrentUser();
          set({ user: profile, isAuthenticated: true, isLoading: false });
        } catch {
          clearToken();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: "agriconnect-auth-store",
      storage,
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
