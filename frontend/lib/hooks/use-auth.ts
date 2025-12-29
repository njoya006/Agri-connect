import { useCallback } from "react";

import { login as loginRequest, logout as logoutRequest, type LoginData, type AuthResponse } from "../api/auth";
import { useAuthStore } from "../store/auth-store";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const login = useCallback(
    async (credentials: LoginData): Promise<AuthResponse> => {
      const response = await loginRequest(credentials);
      setUser(response.user);
      return response;
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    clearUser();
  }, [clearUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  };
}
