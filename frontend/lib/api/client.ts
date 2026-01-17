import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  type AxiosResponse,
} from "axios";

import { clearToken, getToken, setToken } from "./token-manager";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const REFRESH_PATH = "/auth/token/refresh/";

type ErrorResponse = {
  detail?: string;
  message?: string;
  errors?: Record<string, string[] | string>;
};

type RefreshResponse = {
  access?: string;
};

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const enqueueRequest = (callback: (token: string | null) => void) => {
  refreshQueue.push(callback);
};

const flushQueue = (token: string | null) => {
  refreshQueue.forEach((callback) => callback(token));
  refreshQueue = [];
};

const buildErrorMessage = (error: AxiosError<ErrorResponse>) => {
  if (error.response?.data) {
    const { detail, message, errors } = error.response.data;
    if (detail) return detail;
    if (message) return message;
    if (errors) {
      const errorMessages = Object.values(errors)
        .flat()
        .filter(Boolean)
        .join(" \u2022 ");
      if (errorMessages) {
        return errorMessages;
      }
    }
  }
  if (error.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refresh = getToken("refresh");
  if (!refresh) {
    clearToken();
    return null;
  }

  try {
    const response = await axios.post<RefreshResponse>(
      `${BASE_URL}${REFRESH_PATH}`,
      { refresh },
      {
        timeout: 10_000,
        withCredentials: true,
      },
    );

    if (response.data?.access) {
      setToken("access", response.data.access);
      return response.data.access;
    }

    clearToken();
    return null;
  } catch {
    clearToken();
    return null;
  }
};

apiClient.interceptors.request.use((config) => {
  const token = getToken("access");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          enqueueRequest((token) => {
            if (!token) {
              reject(new Error("Session expired. Please log in again."));
              return;
            }
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            originalRequest._retry = true;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const newToken = await refreshAccessToken();
      flushQueue(newToken);
      isRefreshing = false;

      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      return Promise.reject(new Error("Session expired. Please log in again."));
    }

    const message = buildErrorMessage(error);
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
