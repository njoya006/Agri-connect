import apiClient from "./client";
import {
  clearToken as clearStoredToken,
  getToken as getStoredToken,
  setToken as storeToken,
} from "./token-manager";

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: "farmer" | "buyer" | "analyst" | "admin";
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role?: UserProfile["role"];
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: UserProfile;
}

interface TokenPairResponse {
  access: string;
  refresh: string;
}

interface ResetPasswordResponse {
  detail: string;
}

const AUTH_ENDPOINTS = {
  login: "/auth/token/",
  register: "/auth/register/",
  me: "/auth/me/",
  passwordReset: "/auth/password-reset/",
};

export async function login(credentials: LoginData): Promise<AuthResponse> {
  const { data } = await apiClient.post<TokenPairResponse>(AUTH_ENDPOINTS.login, credentials);
  storeToken("access", data.access);
  storeToken("refresh", data.refresh);
  const user = await getCurrentUser();
  return { access: data.access, refresh: data.refresh, user };
}

export async function register(payload: RegisterData): Promise<UserProfile> {
  const { data } = await apiClient.post<UserProfile>(AUTH_ENDPOINTS.register, payload);
  return data;
}

export async function logout(): Promise<void> {
  clearStoredToken();
}

export async function getCurrentUser(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>(AUTH_ENDPOINTS.me);
  return data;
}

export async function resetPassword(email: string): Promise<ResetPasswordResponse> {
  const { data } = await apiClient.post<ResetPasswordResponse>(AUTH_ENDPOINTS.passwordReset, { email });
  return data;
}

export const setToken = storeToken;
export const getToken = getStoredToken;
export const clearToken = clearStoredToken;
